import { BarChart3, Target, Newspaper, Settings, Briefcase, Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
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
          data-testid="button-close-sidebar"
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
              <span className="status-indicator status-online pulse-dot"></span>
              <span className="text-xs text-muted-foreground">Live Market</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20"
          data-testid="nav-dashboard"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="nav-portfolio"
        >
          <Briefcase className="w-5 h-5" />
          <span>Portfolio</span>
        </a>
        
        <a 
          href="/news" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="nav-news"
        >
          <Newspaper className="w-5 h-5" />
          <span>News Center</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="nav-signals"
        >
          <Zap className="w-5 h-5" />
          <span>Signals</span>
          <span className="ml-auto bg-chart-1 text-background text-xs px-2 py-1 rounded-full font-medium number-font">3</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="nav-news"
        >
          <Newspaper className="w-5 h-5" />
          <span>News Feed</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          data-testid="nav-settings"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </a>
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
