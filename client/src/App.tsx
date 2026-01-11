import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { RefreshCw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Layout from "@/components/dashboard-layout";
import VixTermStructure from "@/pages/vix-term-structure";
import SpxPutCall from "@/pages/spx-putcall";
import HyCreditSpread from "@/pages/hy-credit-spread";
import HyIgRatio from "@/pages/hy-ig-ratio";
import SofrSpread from "@/pages/sofr-spread";
import JnkPremium from "@/pages/jnk-premium";
import YieldCurve from "@/pages/yield-curve";
import ErpProxy from "@/pages/erp-proxy";
import Nfci from "@/pages/nfci";
import Landing from "@/pages/landing";
import AccessDenied from "@/pages/access-denied";

function Dashboard() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={VixTermStructure} />
        <Route path="/spx-putcall" component={SpxPutCall} />
        <Route path="/hy-spread" component={HyCreditSpread} />
        <Route path="/hy-ig-ratio" component={HyIgRatio} />
        <Route path="/sofr-spread" component={SofrSpread} />
        <Route path="/jnk-premium" component={JnkPremium} />
        <Route path="/yield-curve" component={YieldCurve} />
        <Route path="/erp-proxy" component={ErpProxy} />
        <Route path="/nfci" component={Nfci} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const { data: accessCheck, isLoading: isCheckingAccess } = useQuery({
    queryKey: ['/api/auth/check-access'],
    queryFn: async () => {
      const res = await fetch('/api/auth/check-access', { credentials: 'include' });
      if (!res.ok) return { allowed: false };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || (isAuthenticated && isCheckingAccess)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (!accessCheck?.allowed) {
    return <AccessDenied />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
