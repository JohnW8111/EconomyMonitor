import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, ReferenceLine } from "recharts";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchNfciHistory } from "@/lib/api";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs">
        <p className="font-mono mb-2 text-muted-foreground">
          Week of {format(parseISO(label), "MMM dd, yyyy")}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium text-foreground">
              {Number(entry.value).toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Nfci() {
  const [period, setPeriod] = useState('2y');
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['nfci-history', period],
    queryFn: () => fetchNfciHistory(period),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading NFCI data from FRED...</p>
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
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const latest = data[data.length - 1];
  
  const isTight = latest.nfci > 0;
  const isStressed = latest.nfci > 0.5;

  const zScoreData = data.filter((d: any) => d.nfciZScore !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Conditions Index</h1>
          <p className="text-muted-foreground mt-1">Chicago Fed National Financial Conditions Index (NFCI) - Weekly</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isStressed ? "destructive" : isTight ? "secondary" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isStressed ? "Stressed" : isTight ? "Tightening" : "Loose"}
            </Badge>
            <Badge variant={latest.nfciZScore > 2 ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                Z-Score: {latest.nfciZScore.toFixed(2)}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-xs">
                Weekly Data
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
        {['1y', '2y', '5y', '10y', 'max'].map(p => (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(isStressed && "border-destructive/50 bg-destructive/5", isTight && !isStressed && "border-amber-500/50 bg-amber-500/5")}>
          <CardHeader className="pb-2">
            <CardDescription>NFCI Value</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", isStressed ? "text-destructive" : isTight ? "text-amber-500" : "text-green-500")} data-testid="text-nfci">
              {latest.nfci.toFixed(4)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {isStressed ? "Financial stress elevated" : isTight ? "Conditions tightening" : "Conditions accommodative"}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest Week</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{format(parseISO(latest.date), "MMM dd, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Weekly release (Fridays)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Points</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">{data.length} weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Historical coverage</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NFCI History</CardTitle>
          <CardDescription>Values above 0 indicate tighter-than-average conditions; below 0 indicates looser conditions</CardDescription>
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
                  minTickGap={60}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine y={0.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Stress", position: "insideTopRight", fill: "hsl(var(--destructive))", fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="nfci" 
                  name="NFCI"
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
            <CardTitle>NFCI Z-Score (Rolling 1-Year)</CardTitle>
            <CardDescription>Standard deviations from the mean ({zScoreData.length} weeks with Z-scores)</CardDescription>
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
                    tickFormatter={(str) => format(parseISO(str), "MMM yy")}
                    minTickGap={60}
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
                    dataKey="nfciZScore" 
                    name="Z-Score"
                    fill="hsl(var(--chart-1))"
                  />
                </ComposedChart>
              </ResponsiveContainer>
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
                The NFCI is a comprehensive index that aggregates 105 measures of financial activity across money markets, 
                debt/equity markets, and banking. A value of zero indicates average conditions, positive values indicate tighter 
                conditions, and negative values indicate looser conditions. Readings above 0.5 historically signal elevated stress.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Data updates weekly (Fridays) • This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
