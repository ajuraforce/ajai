import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useNotificationHelpers } from '@/components/ui/notification-system';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Zap,
  TestTube,
  Trophy,
  AlertTriangle 
} from 'lucide-react';

interface BacktestResult {
  symbol: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  averageReturn: number;
  sharpeRatio: number;
  trades: any[];
}

interface EnhancedSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  technicalScore: number;
  newsScore: number;
  combinedScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: any;
}

export default function SignalAccuracyPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [backtestDays, setBacktestDays] = useState(30);
  const { success, error } = useNotificationHelpers();

  // Fetch signal accuracy
  const { data: accuracy, isLoading: accuracyLoading } = useQuery({
    queryKey: ['/api/signal-accuracy', selectedSymbol],
    enabled: !!selectedSymbol
  });

  // Enhanced signal generation
  const enhancedSignalMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await apiRequest('POST', '/api/enhanced-signal', { symbol });
      return await response.json();
    },
    onSuccess: (data) => {
      success(`Enhanced signal generated for ${data.symbol}: ${data.action} with ${data.confidence}% confidence`);
    },
    onError: (err: any) => {
      error(`Failed to generate enhanced signal: ${err.message}`);
    }
  });

  // Backtesting mutation
  const backtestMutation = useMutation({
    mutationFn: async ({ symbol, days }: { symbol: string; days: number }) => {
      const response = await apiRequest('POST', '/api/backtest', { symbol, days, initialBalance: 10000 });
      return await response.json();
    },
    onSuccess: (data: BacktestResult) => {
      success(`Backtest completed: ${data.winRate.toFixed(1)}% win rate with ${data.totalReturn.toFixed(2)}% return`);
    },
    onError: (err: any) => {
      error(`Backtest failed: ${err.message}`);
    }
  });

  const runBacktest = () => {
    backtestMutation.mutate({ symbol: selectedSymbol, days: backtestDays });
  };

  const generateEnhancedSignal = () => {
    enhancedSignalMutation.mutate(selectedSymbol);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-500';
    if (accuracy >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Signal Accuracy Testing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Symbol:</label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32" data-testid="select-symbol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                  <SelectItem value="ADAUSDT">ADAUSDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Backtest Days:</label>
              <Select value={backtestDays.toString()} onValueChange={(v) => setBacktestDays(parseInt(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateEnhancedSignal}
              disabled={enhancedSignalMutation.isPending}
              data-testid="button-enhanced-signal"
            >
              <Zap className="h-4 w-4 mr-2" />
              {enhancedSignalMutation.isPending ? 'Generating...' : 'Enhanced Signal'}
            </Button>

            <Button 
              onClick={runBacktest}
              disabled={backtestMutation.isPending}
              variant="outline"
              data-testid="button-run-backtest"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {backtestMutation.isPending ? 'Testing...' : 'Run Backtest'}
            </Button>
          </div>

          {/* Current Accuracy */}
          {accuracy && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Accuracy</p>
                <p className={`text-2xl font-bold ${getAccuracyColor(accuracy.accuracy)}`}>
                  {accuracy.accuracy.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Confidence Level</p>
                <p className="text-lg font-semibold">
                  {(accuracy.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Signal Result */}
      {enhancedSignalMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Enhanced Signal Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant={enhancedSignalMutation.data.action === 'BUY' ? 'default' : 
                            enhancedSignalMutation.data.action === 'SELL' ? 'destructive' : 'secondary'}
                    className="text-lg px-3 py-1"
                  >
                    {enhancedSignalMutation.data.action}
                  </Badge>
                  <div>
                    <p className="font-medium">{enhancedSignalMutation.data.symbol}</p>
                    <p className="text-sm text-muted-foreground">${enhancedSignalMutation.data.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{enhancedSignalMutation.data.confidence}%</p>
                  <p className={`text-sm ${getRiskColor(enhancedSignalMutation.data.riskLevel)}`}>
                    {enhancedSignalMutation.data.riskLevel} Risk
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Technical Score</p>
                  <p className={`font-bold ${enhancedSignalMutation.data.technicalScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(enhancedSignalMutation.data.technicalScore * 100).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">News Score</p>
                  <p className={`font-bold ${enhancedSignalMutation.data.newsScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(enhancedSignalMutation.data.newsScore * 100).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Combined</p>
                  <p className={`font-bold ${enhancedSignalMutation.data.combinedScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(enhancedSignalMutation.data.combinedScore * 100).toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-medium mb-1">Analysis:</p>
                <p className="text-sm">{enhancedSignalMutation.data.reasoning}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Target Price:</p>
                  <p className="font-medium">${enhancedSignalMutation.data.targetPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stop Loss:</p>
                  <p className="font-medium">${enhancedSignalMutation.data.stopLoss.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backtest Results */}
      {backtestMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Backtest Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className={`text-xl font-bold ${getAccuracyColor(backtestMutation.data.winRate)}`}>
                    {backtestMutation.data.winRate.toFixed(1)}%
                  </p>
                  <Progress value={backtestMutation.data.winRate} className="mt-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <p className={`text-xl font-bold ${backtestMutation.data.totalReturn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {backtestMutation.data.totalReturn > 0 ? '+' : ''}{backtestMutation.data.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-xl font-bold text-red-500">
                    -{backtestMutation.data.maxDrawdown.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-xl font-bold">
                    {backtestMutation.data.sharpeRatio.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-lg font-semibold">{backtestMutation.data.totalTrades}</p>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500 font-medium">{backtestMutation.data.winningTrades}</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500 font-medium">{backtestMutation.data.losingTrades}</span>
                </div>
              </div>

              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-medium mb-1">Strategy Performance:</p>
                <p className="text-sm">
                  Tested over {backtestMutation.data.period} with {backtestMutation.data.totalTrades} trades. 
                  Average return per trade: ${backtestMutation.data.averageReturn.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signal Accuracy Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Accuracy Improvement Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p><strong>Multiple Indicators:</strong> Combines RSI, MACD, SMA, EMA, and Bollinger Bands for robust analysis</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p><strong>ML Filtering:</strong> Automatically filters conflicting signals and low-confidence trades</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p><strong>Ensemble Method:</strong> Weighs technical analysis (50%), news sentiment (30%), and forecasts (20%)</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p><strong>Risk Assessment:</strong> Each signal includes risk level and stop-loss recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}