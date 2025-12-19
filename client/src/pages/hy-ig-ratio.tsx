import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, ReferenceLine, Line } from "recharts";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchHyIgRatioHistory } from "@/lib/api";

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
              {entry.name.includes("Spread") ? `${entry.value} bps` : Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function HyIgRatio() {
  const [period, setPeriod] = useState('2y');
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['hy-ig-ratio-history', period],
    queryFn: () => fetchHyIgRatioHistory(period),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading HY/IG Ratio data from FRED...</p>
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
  
  const isElevated = latest.ratio > 4;
  const isStress = latest.ratioZScore > 2;
  const ratioChange = Number((latest.ratio - previous.ratio).toFixed(2));

  const zScoreData = data.filter((d: any) => d.ratioZScore !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">HY vs IG Credit Spread Ratio</h1>
          <p className="text-muted-foreground mt-1">High Yield OAS / Investment Grade OAS</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isElevated ? "destructive" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isElevated ? "Elevated Stress" : "Normal"}
            </Badge>
            <Badge variant={isStress ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                Z-Score: {latest.ratioZScore.toFixed(2)}
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
        {['1y', '2y', '5y', '10y'].map(p => (
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
            <CardDescription>HY/IG Ratio</CardDescription>
            <CardTitle className="text-2xl font-mono-nums" data-testid="text-ratio">{latest.ratio.toFixed(2)}x</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Higher = More stress in risky credit</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Change</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", ratioChange > 0 ? "text-destructive" : "text-green-500")}>
              {ratioChange > 0 ? "+" : ""}{ratioChange}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Rising = stress in HY</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>HY Spread</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{latest.hySpread} bps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">High Yield OAS</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IG Spread</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{latest.igSpread} bps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Investment Grade OAS</div>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(isStress && "border-destructive/50 bg-destructive/5")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>Z-Score (1Y)</CardDescription>
              <CardTitle className={cn("text-2xl font-mono-nums", isStress && "text-destructive")} data-testid="text-zscore">
                {latest.ratioZScore.toFixed(2)}σ
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
          <CardTitle>HY/IG Ratio History</CardTitle>
          <CardDescription>Ratio of High Yield to Investment Grade spreads</CardDescription>
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
                <ReferenceLine y={4} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  name="HY/IG Ratio"
                  stroke="hsl(var(--chart-4))" 
                  fill="hsl(var(--chart-4))"
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
          <CardTitle>Spread Comparison</CardTitle>
          <CardDescription>HY vs IG Spreads in basis points</CardDescription>
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
                  dataKey="hySpread" 
                  name="HY Spread"
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="igSpread" 
                  name="IG Spread"
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
          <CardTitle>Ratio Z-Score (Rolling 1-Year)</CardTitle>
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
                    dataKey="ratioZScore" 
                    name="Z-Score"
                    fill="hsl(var(--chart-4))"
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
                The HY/IG ratio compares the extra yield demanded for risky high-yield bonds versus safer investment-grade 
                bonds. A rising ratio indicates that stress is concentrated in riskier credit - investors are demanding 
                proportionally more compensation for default risk. This often signals deteriorating credit conditions 
                and can be a leading indicator of broader market stress.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Data updates daily (EOD) • This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis. • Series: BAMLH0A0HYM2 / BAMLC0A0CM
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
