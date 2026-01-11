import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">RiskTerminal</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4 animate-in fade-in duration-700">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Real-Time US Economic
              <span className="block text-primary">Risk Assessment</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Monitor key financial indicators, credit spreads, volatility, and funding stress in one powerful dashboard. Make informed decisions with real data.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in duration-700 delay-200">
            <Button size="lg" asChild className="text-lg px-8" data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 animate-in fade-in duration-700 delay-300">
            <Card className="bg-muted/30 border-none hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">9 Risk Indicators</h3>
                <p className="text-sm text-muted-foreground">VIX, credit spreads, yield curves, and more - all in real-time</p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30 border-none hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Z-Score Analysis</h3>
                <p className="text-sm text-muted-foreground">Rolling statistical analysis to identify unusual market conditions</p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30 border-none hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">FRED Data</h3>
                <p className="text-sm text-muted-foreground">Powered by Federal Reserve Economic Data - updated daily</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} RiskTerminal. Data from Federal Reserve Economic Data.</p>
      </footer>
    </div>
  );
}
