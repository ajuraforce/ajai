import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Briefcase, 
  Globe, 
  Zap, 
  Rss, 
  Settings, 
  Menu,
  X,
  MessageCircle,
  LogOut,
  User
} from "lucide-react";
import { useState } from "react";
import { ChatModal } from "./chat-modal";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationHelpers } from "@/components/ui/notification-system";

interface NavigationItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: "/",
    label: "Dashboard",
    icon: BarChart3
  },
  {
    path: "/portfolio",
    label: "Portfolio",
    icon: Briefcase
  },
  {
    path: "/news-center",
    label: "News Center",
    icon: Globe
  },
  {
    path: "/signals",
    label: "Signals",
    icon: Zap,
    badge: "3"
  },
  {
    path: "/newsfeed",
    label: "News Feed",
    icon: Rss
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings
  }
];

interface MainNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MainNavigation({ isOpen, onToggle }: MainNavigationProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-64 bg-card border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Logo and Platform Status */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AJAI</h1>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-muted-foreground">Live Market</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                onClick={() => onToggle()}
                data-testid={`nav-link-${item.path.replace('/', '') || 'dashboard'}`}
              >
                <Icon className="w-5 h-5" />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-chart-1 text-background text-xs px-2 py-1 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Account Section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-foreground">AI</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Trading Bot</p>
              <p className="text-xs text-muted-foreground">Active Session</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TopHeader({ onMenuToggle, isMenuOpen }: { onMenuToggle: () => void, isMenuOpen: boolean }) {
  const { user, logout } = useAuth();
  const { success } = useNotificationHelpers();

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMenuToggle}
            data-testid="button-menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <h2 className="text-lg sm:text-xl font-semibold">Trading Dashboard</h2>
          <div className="hidden sm:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-muted-foreground">Market Open</span>
            </div>
            <div className="text-muted-foreground number-font" data-testid="current-time">
              {new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                timeZone: 'America/New_York' 
              })} EST
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Real-time Status Indicators */}
          <div className="hidden lg:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>OpenAI</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Market Data</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span>News Feed</span>
            </div>
          </div>
          
          {/* User Info and Logout */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <User className="w-4 h-4" />
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                success('Logged out successfully');
              }}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:ml-2 sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40"
        size="sm"
        data-testid="button-toggle-chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      
      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        userId="demo-user" 
      />
    </>
  );
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <div className="min-h-screen bg-background flex">
      <MainNavigation isOpen={isMenuOpen} onToggle={handleMenuToggle} />
      <div className="flex-1 lg:ml-0 flex flex-col">
        <TopHeader onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen} />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <ChatButton />
    </div>
  );
}