import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/lib/data";

// Pages
import DailyFeed from "@/pages/daily-feed";
import AIChat from "@/pages/ai-chat";
import ManageSources from "@/pages/manage-sources";
import SourceView from "@/pages/source-view";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={DailyFeed} />
      <Route path="/chat" component={AIChat} />
      <Route path="/manage" component={ManageSources} />
      <Route path="/source/:sourceId" component={SourceView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
