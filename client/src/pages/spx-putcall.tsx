import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, ReferenceLine } from "recharts";
import { AlertTriangle, Info, RefreshCw, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchSpxPutCallHistory } from "@/lib/api";

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
              {Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SpxPutCall() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['spx-putcall-history'],
    queryFn: () => fetchSpxPutCallHistory(),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SPX Put-Call Ratio data from YCharts...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
    
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-lg border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-amber-500">Error Loading Data</CardTitle>
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
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Building History
            </CardTitle>
            <CardDescription>
              No data available yet. The system will accumulate historical data each day as it scrapes the latest values from YCharts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full" data-testid="button-refresh-empty">
              <RefreshCw className="h-4 w-4 mr-2" />
              Fetch Latest Data
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = data[data.length - 1];
  
  const isElevated = latest.ratio > 1.5;
  const isExtreme = latest.ratioZScore > 2 || latest.ratioZScore < -2;

  const zScoreData = data.filter((d: any) => d.ratioZScore !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SPX Put-Call Ratio</h1>
          <p className="text-muted-foreground mt-1">CBOE SPX Options Put/Call Volume Ratio</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isElevated ? "destructive" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isElevated ? "Elevated Fear" : "Normal"}
            </Badge>
            {zScoreData.length > 0 && (
              <Badge variant={isExtreme ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                  Z-Score: {latest.ratioZScore.toFixed(2)}
              </Badge>
            )}
            <Badge variant="outline" className="px-3 py-1 text-xs">
                <Database className="h-3 w-3 mr-1" />
                {data.length} days stored
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(isElevated && "border-destructive/50 bg-destructive/5")}>
          <CardHeader className="pb-2">
            <CardDescription>Put-Call Ratio</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", isElevated ? "text-destructive" : "text-green-500")} data-testid="text-ratio">
              {latest.ratio.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {latest.ratio > 1 ? "Puts > Calls (bearish)" : "Calls > Puts (bullish)"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest Date</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{format(parseISO(latest.date), "MMM dd, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">From YCharts (CBOE data)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>History Stored</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{data.length} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Building history over time</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Put-Call Ratio History</CardTitle>
          <CardDescription>SPX options put/call volume ratio (higher = more puts = more fear)</CardDescription>
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
                  tickFormatter={(str) => format(parseISO(str), "MMM dd")}
                  minTickGap={40}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: "P/C = 1", position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  name="Put-Call Ratio"
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {zScoreData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Put-Call Ratio Z-Score (Rolling 1-Year)</CardTitle>
            <CardDescription>Standard deviations from the mean ({zScoreData.length} data points with Z-scores)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={zScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(str) => format(parseISO(str), "MMM dd")}
                    minTickGap={40}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    domain={[-4, 4]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <ReferenceLine y={2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <ReferenceLine y={-2} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="ratioZScore" 
                    name="Z-Score"
                    fill="hsl(var(--chart-1))"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {zScoreData.length === 0 && data.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Database className="h-6 w-6 text-blue-500 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Building Z-Score History</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Z-scores require 252 trading days of history to calculate. Currently storing {data.length} days. 
                  The system will continue to accumulate data each day.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-none">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-primary mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Why this matters</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The SPX put-call ratio measures the volume of put options vs call options traded on the S&P 500 index. 
                A ratio above 1 indicates more puts (bearish bets) than calls (bullish bets), suggesting elevated fear or hedging activity.
                Extreme readings can signal contrarian opportunities.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Data source: YCharts (CBOE underlying data) • History accumulates daily in local storage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
