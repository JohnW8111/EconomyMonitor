import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/dashboard-layout";
import VixTermStructure from "@/pages/vix-term-structure";
import HyCreditSpread from "@/pages/hy-credit-spread";
import HyIgRatio from "@/pages/hy-ig-ratio";
import SofrSpread from "@/pages/sofr-spread";
import JnkPremium from "@/pages/jnk-premium";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={VixTermStructure} />
        <Route path="/hy-spread" component={HyCreditSpread} />
        <Route path="/hy-ig-ratio" component={HyIgRatio} />
        <Route path="/sofr-spread" component={SofrSpread} />
        <Route path="/jnk-premium" component={JnkPremium} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
