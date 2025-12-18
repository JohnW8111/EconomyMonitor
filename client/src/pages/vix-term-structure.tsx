import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar } from "recharts";
import { AlertCircle, ArrowDown, ArrowUp, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchVixHistory } from "@/lib/api";

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
        <p className="font-mono mb-2 text-muted-foreground">{format(parseISO(label), "MMM dd, yyyy")}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">{Number(entry.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function VixTermStructure() {
  const [period, setPeriod] = useState('2y');
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['vix-history', period],
    queryFn: () => fetchVixHistory(period),
    staleTime: 12 * 60 * 60 * 1000, // 12 hours - data updates daily
    refetchInterval: false, // No auto-refresh, data is cached server-side
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading VIX data from FRED...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch VIX data';
    const isMissingApiKey = errorMessage.includes('FRED_API_KEY');
    
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-lg border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-amber-500">
                {isMissingApiKey ? 'API Key Required' : 'Error Loading Data'}
              </CardTitle>
            </div>
            <CardDescription className="text-foreground/80 mt-2">
              {isMissingApiKey ? (
                <>
                  To display real VIX data, you need a free FRED API key.
                  <ol className="list-decimal list-inside mt-3 space-y-2 text-sm">
                    <li>Go to <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">fred.stlouisfed.org</a></li>
                    <li>Create a free account and request an API key</li>
                    <li>Add it as a secret named <code className="bg-muted px-1 py-0.5 rounded text-xs">FRED_API_KEY</code></li>
                  </ol>
                </>
              ) : (
                errorMessage
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full" data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  
  const isBackwardation = latest.slope < 0;
  const isStress = latest.slopeZScore < -2;

  // Calculate change
  const slopeChange = latest.slope - previous.slope;

  // Filter to only show data points where Z-score is calculated (non-zero or after enough history)
  const zScoreData = data.filter((d: any) => d.slopeZScore !== 0 || data.indexOf(d) >= 251);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Equity Volatility Term Structure</h1>
          <p className="text-muted-foreground mt-1">VIX (Spot) vs VIX3M (3-Month Implied Volatility)</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isBackwardation ? "destructive" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isBackwardation ? "Backwardation (Stress)" : "Contango (Normal)"}
            </Badge>
            <Badge variant={isStress ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                Z-Score: {latest.slopeZScore.toFixed(2)}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['1y', '2y', '5y'].map(p => (
          <Button 
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
            data-testid={`button-period-${p}`}
          >
            {p.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spot VIX</CardDescription>
            <CardTitle className="text-2xl font-mono-nums" data-testid="text-vix">{latest.vix.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">1-Month Implied Volatility</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>VIX3M</CardDescription>
            <CardTitle className="text-2xl font-mono-nums" data-testid="text-vix3m">{latest.vix3m.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">3-Month Implied Volatility</div>
          </CardContent>
        </Card>

        <Card className={cn(isBackwardation ? "border-destructive/50 bg-destructive/10" : "")}>
          <CardHeader className="pb-2">
            <CardDescription>Term Structure Slope</CardDescription>
            <div className="flex items-end gap-2">
                <CardTitle className={cn("text-2xl font-mono-nums", isBackwardation ? "text-destructive" : "text-emerald-500")} data-testid="text-slope">
                    {latest.slope.toFixed(2)}
                </CardTitle>
                <span className={cn("text-xs mb-1 font-mono", slopeChange >= 0 ? "text-emerald-500" : "text-destructive")} data-testid="text-slope-change">
                    {slopeChange > 0 ? "+" : ""}{slopeChange.toFixed(2)}
                </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">VIX3M - VIX</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Slope Z-Score (1Y)</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", latest.slopeZScore < -1.5 ? "text-amber-500" : "")} data-testid="text-zscore">
                {latest.slopeZScore.toFixed(2)}σ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Deviations from mean</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
            <CardTitle>VIX vs VIX3M History</CardTitle>
            <CardDescription>
              Comparing short-term vs medium-term volatility expectations
              <span className="ml-2 text-xs text-muted-foreground">• Last update: {format(parseISO(latest.date), "MMM dd, yyyy")}</span>
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorVix" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorVix3m" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tickFormatter={(str) => format(parseISO(str), "MMM yy")}
                            minTickGap={30}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="vix" 
                            name="VIX" 
                            stroke="hsl(var(--chart-3))" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorVix)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="vix3m" 
                            name="VIX3M" 
                            stroke="hsl(var(--chart-1))" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorVix3m)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* Slope Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Term Structure Slope (VIX3M - VIX)</CardTitle>
                <CardDescription>Negative values indicate stress (Backwardation)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12}
                                tickFormatter={(str) => format(parseISO(str), "MMM")}
                                minTickGap={30}
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={12}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                            <Area 
                                type="monotone" 
                                dataKey="slope" 
                                name="Slope" 
                                stroke="hsl(var(--chart-2))" 
                                fill="hsl(var(--chart-2))"
                                fillOpacity={0.2}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Slope Z-Score (Rolling 1-Year)</CardTitle>
                <CardDescription>Standard deviations from the mean ({zScoreData.length} data points)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {zScoreData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={zScoreData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                              <XAxis 
                                  dataKey="date" 
                                  stroke="hsl(var(--muted-foreground))" 
                                  fontSize={12}
                                  tickFormatter={(str) => format(parseISO(str), "MMM yy")}
                                  minTickGap={40}
                              />
                              <YAxis 
                                  stroke="hsl(var(--muted-foreground))" 
                                  fontSize={12}
                                  domain={[-8, 2]}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                              <ReferenceLine y={-2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                              <Bar 
                                  dataKey="slopeZScore" 
                                  name="Z-Score"
                                  fill="hsl(var(--primary))"
                              />
                          </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Need 252+ trading days of history to calculate Z-scores
                      </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="bg-muted/30 border-none">
        <CardContent className="pt-6">
            <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-primary mt-1" />
                <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Why this matters</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        The VIX Term Structure measures the difference between 3-month implied volatility (VIX3M) and 1-month implied volatility (VIX). 
                        Normally, longer-term volatility is higher than short-term (Contango), reflecting the uncertainty of time. 
                        When spot VIX spikes above VIX3M (Backwardation), it indicates acute near-term fear and stress in the market. 
                        This indicator tracks that slope and its statistical significance (Z-Score) to flag potential crisis events.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Data updates daily (EOD) • Source: Federal Reserve Economic Data (FRED)
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper to handle the Bar chart color logic cleanly
function BarChartWrapper({ data }: { data: any[] }) {
    return (
        <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickFormatter={(str) => format(parseISO(str), "MMM")}
                minTickGap={30}
            />
            <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <ReferenceLine y={-2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: '-2σ', fill: 'hsl(var(--destructive))', fontSize: 10 }} />
            <Bar 
                dataKey="slopeZScore" 
                name="Z-Score"
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
            />
        </ComposedChart>
    )
}
