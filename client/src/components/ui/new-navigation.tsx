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
  LogOut,
  User
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationHelpers } from "@/components/ui/notification-system";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: BarChart3 },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
  { path: "/news-center", label: "News Center", icon: Globe },
  { path: "/signals", label: "Signals", icon: Zap, badge: "3" },
  { path: "/newsfeed", label: "News Feed", icon: Rss },
  { path: "/settings", label: "Settings", icon: Settings }
];

interface NewSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

function NewSidebar({ isVisible, onClose }: NewSidebarProps) {
  const [location] = useLocation();

  const handleNavClick = () => {
    // Close sidebar when user clicks a nav link (mobile only)
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-64 bg-card border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isVisible ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
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
                onClick={handleNavClick}
                data-testid={`new-nav-${item.path.replace('/', '') || 'dashboard'}`}
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
            <div className="flex-1">
              <p className="text-sm font-medium">Demo Account</p>
              <p className="text-xs text-muted-foreground">Trading Mode</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface NewHeaderProps {
  onMenuClick: () => void;
  isMenuOpen: boolean;
}

function NewHeader({ onMenuClick, isMenuOpen }: NewHeaderProps) {
  const { user, logout } = useAuth();
  const { success } = useNotificationHelpers();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    console.log('🚪 Logout initiated');
    logout();
    navigate('/login', { replace: true });
    success('Logged out successfully');
  };

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onMenuClick}
            data-testid="new-menu-button"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <h2 className="text-lg sm:text-xl font-semibold">Trading Dashboard</h2>
          <div className="hidden sm:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-muted-foreground">Market Open</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* User Info and Logout */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <User className="w-4 h-4" />
              <span className="text-muted-foreground">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="new-logout-button"
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

export function NewPageLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-background flex">
      <NewSidebar isVisible={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 flex flex-col">
        <NewHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}