import { Link, useLocation } from "wouter";
import { 
  TrendingUp, 
  Activity, 
  Menu,
  ShieldAlert,
  DollarSign
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const RISK_INDICATORS = [
  { id: "vix", name: "(Volatility) VIX Term Structure", href: "/", icon: Activity, active: true },
  { id: "hy-spread", name: "(Credit) HY Credit Spread", href: "/hy-spread", icon: DollarSign, active: true },
  { id: "hy-ig-ratio", name: "(Credit) HY/IG Spread Ratio", href: "/hy-ig-ratio", icon: TrendingUp, active: true },
  { id: "sofr-spread", name: "(Funding & Liquidity) Funding Stress", href: "/sofr-spread", icon: TrendingUp, active: true },
  { id: "jnk-premium", name: "(Funding & Liquidity) HY ETF Discount/Premium", href: "/jnk-premium", icon: DollarSign, active: true },
  { id: "yield-curve", name: "(Macro/Curve) Yield Curve Slope", href: "/yield-curve", icon: TrendingUp, active: true },
  { id: "move", name: "Rates Volatility", href: "/move", icon: TrendingUp, active: false },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">Risk<span className="text-primary">Terminal</span></span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">US Economic Risk Assessment</div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Risk Indicators
        </div>
        <nav className="space-y-1 px-2">
          {RISK_INDICATORS.map((indicator) => {
            const isActive = location === indicator.href;
            const Icon = indicator.icon;
            
            return (
              <Link key={indicator.id} href={indicator.active ? indicator.href : "#"}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  !indicator.active && "opacity-60 cursor-not-allowed"
                )}>
                  <Icon className="h-4 w-4" />
                  {indicator.name}
                  {!indicator.active && (
                    <span className="ml-auto text-[10px] bg-sidebar-border px-1.5 py-0.5 rounded text-muted-foreground">
                      SOON
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
            Data Sources: FRED, State Street
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <NavContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
           <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="font-bold">RiskTerminal</span>
           </div>
           <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
             <SheetTrigger asChild>
               <Button variant="ghost" size="icon">
                 <Menu className="h-5 w-5" />
               </Button>
             </SheetTrigger>
             <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar">
               <NavContent />
             </SheetContent>
           </Sheet>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}
