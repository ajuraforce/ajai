import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/ui/notification-system";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import LoginForm from "@/components/auth/login-form";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio";
import NewsCenter from "@/pages/news-center";
import Signals from "@/pages/signals";
import NewsFeed from "@/pages/newsfeed";
import Settings from "@/pages/settings";
import NewsPage from "@/pages/news";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading your trading platform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/news-center" component={NewsCenter} />
      <Route path="/signals" component={Signals} />
      <Route path="/newsfeed" component={NewsFeed} />
      <Route path="/settings" component={Settings} />
      <Route path="/news" component={NewsCenter} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <AuthProvider>
            <PreferencesProvider>
              <div className="dark">
                <Toaster />
                <Router />
              </div>
            </PreferencesProvider>
          </AuthProvider>
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
