import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Bell, Palette, Clock, Save, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { NewPageLayout } from "@/components/ui/new-navigation";

export default function SettingsPage() {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    // Risk Management
    riskTolerance: 2.0,
    maxPositionSize: 10000,
    stopLossEnabled: true,
    autoCloseEnabled: false,
    
    // Notifications
    notificationsEnabled: true,
    emailNotifications: true,
    pushNotifications: true,
    signalAlerts: true,
    newsAlerts: false,
    
    // Display & Performance
    theme: 'dark',
    refreshInterval: 60,
    chartTimeframe: '1h',
    compactMode: false,
    
    // Trading
    paperTradingMode: true,
    autoExecuteSignals: false,
    confirmBeforeTrade: true,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      return await apiRequest("POST", "/api/user/settings", {
        body: JSON.stringify(newSettings)
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <NewPageLayout>
      <div className="container mx-auto space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>Risk Management</span>
            {settings.paperTradingMode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                Paper Trading
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="risk-tolerance">Risk Tolerance (%)</Label>
              <div className="px-2">
                <Slider
                  value={[settings.riskTolerance]}
                  onValueChange={(value) => updateSetting('riskTolerance', value[0])}
                  max={10}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Conservative (0.5%)</span>
                <span className="font-medium">{settings.riskTolerance}%</span>
                <span>Aggressive (10%)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-position">Max Position Size ($)</Label>
              <Input
                id="max-position"
                type="number"
                value={settings.maxPositionSize}
                onChange={(e) => updateSetting('maxPositionSize', parseFloat(e.target.value))}
                min={100}
                max={100000}
                step={100}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stop Loss Protection</Label>
                <p className="text-sm text-muted-foreground">Automatically set stop losses</p>
              </div>
              <Switch
                checked={settings.stopLossEnabled}
                onCheckedChange={(checked) => updateSetting('stopLossEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Close Positions</Label>
                <p className="text-sm text-muted-foreground">Close positions at target profit</p>
              </div>
              <Switch
                checked={settings.autoCloseEnabled}
                onCheckedChange={(checked) => updateSetting('autoCloseEnabled', checked)}
              />
            </div>
          </div>

          {settings.riskTolerance > 5 && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                High risk tolerance selected. Consider reducing for safer trading.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Master notification toggle</p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Daily reports and alerts</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                disabled={!settings.notificationsEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Signal Alerts</Label>
                <p className="text-sm text-muted-foreground">New trading signal notifications</p>
              </div>
              <Switch
                checked={settings.signalAlerts}
                onCheckedChange={(checked) => updateSetting('signalAlerts', checked)}
                disabled={!settings.notificationsEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>News Alerts</Label>
                <p className="text-sm text-muted-foreground">High-impact market news</p>
              </div>
              <Switch
                checked={settings.newsAlerts}
                onCheckedChange={(checked) => updateSetting('newsAlerts', checked)}
                disabled={!settings.notificationsEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display & Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-500" />
            <span>Display & Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Refresh Interval</Label>
              <Select
                value={settings.refreshInterval.toString()}
                onValueChange={(value) => updateSetting('refreshInterval', parseInt(value))}
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chart-timeframe">Default Chart Timeframe</Label>
              <Select
                value={settings.chartTimeframe}
                onValueChange={(value) => updateSetting('chartTimeframe', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 minute</SelectItem>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked) => updateSetting('compactMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trading */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-orange-500" />
            <span>Trading Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Paper Trading Mode</Label>
                <p className="text-sm text-muted-foreground">Practice with virtual money</p>
              </div>
              <Switch
                checked={settings.paperTradingMode}
                onCheckedChange={(checked) => updateSetting('paperTradingMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Confirm Before Trade</Label>
                <p className="text-sm text-muted-foreground">Show confirmation dialog</p>
              </div>
              <Switch
                checked={settings.confirmBeforeTrade}
                onCheckedChange={(checked) => updateSetting('confirmBeforeTrade', checked)}
              />
            </div>
          </div>
          
          {!settings.paperTradingMode && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-400">
                Live trading mode enabled. Real money will be used for trades.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </NewPageLayout>
  );
}