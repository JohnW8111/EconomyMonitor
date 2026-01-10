import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, ReferenceLine, Area } from "recharts";
import { AlertTriangle, Info, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
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
        <p className="font-mono mb-2 text-muted-foreground">{format(parseISO(label), "EEE, MMM dd, yyyy")}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">
              {entry.name === "Put/Call Ratio" ? Number(entry.value).toFixed(2) :
               entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export default function PutCallRatio() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['spx-putcall-history'],
    queryFn: fetchSpxPutCallHistory,
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SPX Put-Call Ratio data from CBOE...</p>
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
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              SPX Put-Call Ratio data is being collected. Data is scraped from CBOE daily market statistics.
              Please check back after market hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full" data-testid="button-refresh-empty">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;
  const ratioChange = previous ? latest.ratio - previous.ratio : 0;
  
  const avgRatio = data.reduce((sum, d) => sum + d.ratio, 0) / data.length;
  const isBearish = latest.ratio > 1.2;
  const isBullish = latest.ratio < 0.8;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SPX Put-Call Ratio</h1>
          <p className="text-muted-foreground mt-1">S&P 500 Index Options (SPX + SPXW) Volume-Based Put/Call Ratio</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={isBearish ? "destructive" : isBullish ? "default" : "outline"} 
              className="px-3 py-1 text-sm font-medium uppercase tracking-wide"
            >
              {isBearish ? "Bearish Hedging" : isBullish ? "Bullish Sentiment" : "Neutral"}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
              Ratio: {latest.ratio.toFixed(2)}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription>Current Ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-foreground" data-testid="text-current-ratio">{latest.ratio.toFixed(2)}</span>
              {ratioChange !== 0 && (
                <span className={cn("text-sm flex items-center", ratioChange > 0 ? "text-red-500" : "text-green-500")}>
                  {ratioChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(ratioChange).toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription>7-Day Average</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold font-mono text-foreground" data-testid="text-avg-ratio">{avgRatio.toFixed(2)}</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription>Put Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold font-mono text-red-500" data-testid="text-put-volume">{formatVolume(latest.putVolume)}</span>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription>Call Volume</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold font-mono text-green-500" data-testid="text-call-volume">{formatVolume(latest.callVolume)}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Put-Call Ratio (Last 7 Trading Days)</CardTitle>
          <CardDescription>
            SPX + SPXW volume-based put/call ratio from CBOE daily market statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ratioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(value) => format(parseISO(value), "MM/dd")}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#ratioGradient)"
                  name="Put/Call Ratio"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Volume Breakdown</CardTitle>
          <CardDescription>
            Daily put and call volumes for SPX + SPXW options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(value) => format(parseISO(value), "MM/dd")}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(value) => formatVolume(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="callVolume" fill="hsl(142, 76%, 36%)" name="Call Volume" stackId="a" />
                <Bar dataKey="putVolume" fill="hsl(0, 84%, 60%)" name="Put Volume" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">About This Indicator</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The SPX Put-Call Ratio measures the volume of put options versus call options on S&P 500 index options 
            (SPX and SPXW). A ratio above 1.0 indicates more puts are being traded than calls, suggesting increased 
            hedging activity or bearish sentiment.
          </p>
          <p>
            <strong>Interpretation:</strong> Ratios above 1.2 typically indicate elevated hedging/fear, while ratios 
            below 0.8 may suggest complacency or bullish positioning. Extreme readings can be contrarian indicators.
          </p>
          <p className="text-xs opacity-70">
            Data Source: CBOE Daily Market Statistics. Data is scraped from the official CBOE website and cached for 12 hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
