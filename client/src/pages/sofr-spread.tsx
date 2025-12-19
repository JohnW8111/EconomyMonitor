import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, ReferenceLine, Line } from "recharts";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchSofrSpreadHistory } from "@/lib/api";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
        <p className="font-mono mb-2 text-muted-foreground">{format(parseISO(label), "MMM dd, yyyy")}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">
              {entry.name === "Spread" ? `${entry.value} bps` : 
               entry.name === "Z-Score" ? Number(entry.value).toFixed(2) :
               `${entry.value}%`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SofrSpread() {
  const [period, setPeriod] = useState('2y');
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['sofr-spread-history', period],
    queryFn: () => fetchSofrSpreadHistory(period),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SOFR-Treasury spread data from FRED...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
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
              {errorMessage}
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
  
  const isElevated = latest.spread > 20;
  const isStress = latest.spreadZScore > 2;
  const spreadChange = latest.spread - previous.spread;

  const zScoreData = data.filter((d: any) => d.spreadZScore !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Funding Stress</h1>
          <p className="text-muted-foreground mt-1">SOFR 90-Day Average minus 3-Month T-Bill (Modern TED Spread)</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isElevated ? "destructive" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isElevated ? "Elevated" : "Normal"}
            </Badge>
            <Badge variant={isStress ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                Z-Score: {latest.spreadZScore.toFixed(2)}
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

      <div className="flex gap-2">
        {['1y', '2y', '5y', 'max'].map(p => (
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SOFR-Treasury Spread</CardDescription>
            <CardTitle className="text-2xl font-mono-nums" data-testid="text-spread">{latest.spread} bps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Interbank vs risk-free spread</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Change</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", spreadChange > 0 ? "text-destructive" : "text-green-500")}>
              {spreadChange > 0 ? "+" : ""}{spreadChange} bps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Widening = stress</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>SOFR 90-Day Avg</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{latest.sofr90}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Secured overnight rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>3-Month T-Bill</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{latest.tbill3m}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Risk-free rate</div>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(isStress && "border-destructive/50 bg-destructive/5")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>Z-Score (1Y)</CardDescription>
              <CardTitle className={cn("text-2xl font-mono-nums", isStress && "text-destructive")} data-testid="text-zscore">
                {latest.spreadZScore.toFixed(2)}σ
              </CardTitle>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {isStress ? "Above 2σ - Stress Signal" : "Within normal range"}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SOFR-Treasury Spread History</CardTitle>
          <CardDescription>Spread in basis points (SOFR90DAYAVG - DTB3)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={20} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Area 
                  type="monotone" 
                  dataKey="spread" 
                  name="Spread"
                  stroke="hsl(var(--chart-5))" 
                  fill="hsl(var(--chart-5))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Comparison</CardTitle>
          <CardDescription>SOFR 90-Day Average vs 3-Month T-Bill</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="sofr90" 
                  name="SOFR 90-Day"
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="tbill3m" 
                  name="3M T-Bill"
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spread Z-Score (Rolling 1-Year)</CardTitle>
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
                    domain={[-3, 5]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <ReferenceLine y={2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="spreadZScore" 
                    name="Z-Score"
                    fill="hsl(var(--chart-5))"
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

      <Card className="bg-muted/30 border-none">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Why this matters</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The SOFR-Treasury spread is a modern replacement for the classic TED spread (which used LIBOR). 
                It measures the difference between secured overnight financing rates and risk-free Treasury bills. 
                A widening spread indicates increased perceived credit/counterparty risk in the banking system - 
                when banks become nervous about lending to each other, this spread spikes. Historical spikes 
                have coincided with financial crises and market stress events.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Data updates daily (EOD) • This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis. • Series: SOFR90DAYAVG, DTB3
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
