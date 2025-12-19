import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, ReferenceLine } from "recharts";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { fetchJnkPremiumHistory } from "@/lib/api";

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
              {entry.name === "Premium/Discount" ? `${entry.value > 0 ? '+' : ''}${entry.value}%` : 
               entry.name === "Z-Score" ? Number(entry.value).toFixed(2) :
               `$${entry.value}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function JnkPremium() {
  const [period, setPeriod] = useState('2y');
  
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['jnk-premium-history', period],
    queryFn: () => fetchJnkPremiumHistory(period),
    staleTime: 12 * 60 * 60 * 1000,
    refetchInterval: false,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading JNK ETF premium/discount data from State Street...</p>
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
  const previous = data.length > 1 ? data[data.length - 2] : latest;
  
  const isDiscount = latest.premium < 0;
  const isStress = latest.premium < -1;
  const premiumChange = Number((latest.premium - previous.premium).toFixed(2));

  const zScoreData = data.filter((d: any) => d.premiumZScore !== 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">HY ETF Discount/Premium</h1>
          <p className="text-muted-foreground mt-1">JNK (SPDR Bloomberg High Yield Bond ETF) vs Net Asset Value</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isStress ? "destructive" : isDiscount ? "secondary" : "outline"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                {isStress ? "Stress" : isDiscount ? "Discount" : "Premium"}
            </Badge>
            <Badge variant={latest.premiumZScore < -2 ? "destructive" : "secondary"} className="px-3 py-1 text-sm font-medium uppercase tracking-wide">
                Z-Score: {latest.premiumZScore.toFixed(2)}
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
        <Card className={cn(isStress && "border-destructive/50 bg-destructive/5")}>
          <CardHeader className="pb-2">
            <CardDescription>Premium/Discount</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", isDiscount ? "text-destructive" : "text-green-500")} data-testid="text-premium">
              {latest.premium > 0 ? "+" : ""}{latest.premium}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">ETF price vs NAV</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Change</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", premiumChange < 0 ? "text-destructive" : "text-green-500")}>
              {premiumChange > 0 ? "+" : ""}{premiumChange}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">vs previous day</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NAV</CardDescription>
            <CardTitle className="text-2xl font-mono-nums">${latest.nav}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Net Asset Value per share</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Z-Score (1Y)</CardDescription>
            <CardTitle className={cn("text-2xl font-mono-nums", latest.premiumZScore < -2 && "text-destructive")} data-testid="text-zscore">
              {latest.premiumZScore.toFixed(2)}σ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">{latest.premiumZScore < -2 ? "Unusually low" : "Normal range"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premium/Discount History</CardTitle>
          <CardDescription>JNK ETF price vs Net Asset Value (%)</CardDescription>
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
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                <ReferenceLine y={-1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="premium" 
                  name="Premium/Discount"
                  stroke="hsl(var(--chart-3))" 
                  fill="hsl(var(--chart-3))"
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
          <CardTitle>NAV History</CardTitle>
          <CardDescription>Net Asset Value per share ($)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
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
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="nav" 
                  name="NAV"
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

      <Card>
        <CardHeader>
          <CardTitle>Premium/Discount Z-Score (Rolling 1-Year)</CardTitle>
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
                    domain={[-4, 4]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <ReferenceLine y={-2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="premiumZScore" 
                    name="Z-Score"
                    fill="hsl(var(--chart-3))"
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
                Persistent discount (ETF trading below NAV) indicates liquidity stress: underlying bonds are harder to trade than the ETF.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Data updates daily (EOD) • Source: State Street SPDR • Ticker: JNK
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
