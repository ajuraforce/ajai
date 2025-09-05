import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, TrendingUp, TrendingDown, Target, Shield, Clock, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useNotificationHelpers } from "@/components/ui/notification-system";
import TradeConfirmationModal from "@/components/ui/trade-confirmation-modal";

import { NewPageLayout } from "@/components/ui/new-navigation";

export default function Signals() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [lastTrade, setLastTrade] = useState<any>(null);
  
  const { tradeExecuted } = useNotificationHelpers();
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["/api/signals"],
    refetchInterval: 10000,
  });

  const executeSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const response = await apiRequest("POST", `/api/signals/execute/${signalId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setLastTrade(data.tradeExecution);
      setShowConfirmationModal(true);
      
      tradeExecuted(
        data.tradeExecution.symbol,
        data.tradeExecution.action,
        data.tradeExecution.filledPrice
      );
      
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const signalsArray = Array.isArray(signals) ? signals : [];
  const filteredSignals = activeOnly 
    ? signalsArray.filter((signal: any) => signal.isActive !== false)
    : signalsArray;

  if (isLoading) {
    return (
      <NewPageLayout>
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Trading Signals</h1>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </NewPageLayout>
    );
  }

  return (
    <NewPageLayout>
      <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Trading Signals</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="active-only"
              checked={activeOnly}
              onCheckedChange={setActiveOnly}
            />
            <Label htmlFor="active-only">Active Only</Label>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live AI Analysis</span>
          </Badge>
        </div>
      </div>

      {/* Signals Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredSignals.length}</div>
            <div className="text-sm text-muted-foreground">Active Signals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredSignals.filter((s: any) => s.action === 'BUY').length}
            </div>
            <div className="text-sm text-muted-foreground">Buy Signals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredSignals.filter((s: any) => s.action === 'SELL').length}
            </div>
            <div className="text-sm text-muted-foreground">Sell Signals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(filteredSignals.reduce((avg: number, s: any) => avg + parseFloat(s.confidence || 0), 0) / filteredSignals.length || 0)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </CardContent>
        </Card>
      </div>

      {/* Signals List */}
      <div className="space-y-4">
        {filteredSignals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No signals available</h3>
              <p className="text-muted-foreground">
                {activeOnly ? "No active signals found. Try showing all signals." : "AI is analyzing market conditions..."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSignals.map((signal: any) => (
            <Card 
              key={signal.id} 
              className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
                signal.action === "BUY" 
                  ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/10" 
                  : "border-l-red-500 bg-red-50/30 dark:bg-red-950/10"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {signal.action === "BUY" ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                      <h3 className="text-xl font-bold">{signal.symbol}</h3>
                    </div>
                    <Badge 
                      className={`text-sm font-medium px-3 py-1 ${
                        signal.action === "BUY" 
                          ? "bg-green-500 text-white hover:bg-green-600" 
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                    >
                      {signal.action}
                    </Badge>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Confidence</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {signal.confidence}%
                    </div>
                  </div>
                </div>

                {/* Price Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Entry Price</div>
                    <div className="font-bold text-lg">
                      ${parseFloat(signal.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {signal.targetPrice && (
                    <div>
                      <div className="text-sm text-muted-foreground">Target</div>
                      <div className="font-medium text-green-600">
                        ${parseFloat(signal.targetPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  {signal.stopLoss && (
                    <div>
                      <div className="text-sm text-muted-foreground">Stop Loss</div>
                      <div className="font-medium text-red-600">
                        ${parseFloat(signal.stopLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Potential Return</div>
                    <div className="font-medium text-blue-600">
                      {signal.targetPrice ? 
                        `${(((parseFloat(signal.targetPrice) - parseFloat(signal.price)) / parseFloat(signal.price)) * 100).toFixed(1)}%` :
                        "N/A"
                      }
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                {signal.reasoning && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">AI Analysis</span>
                    </div>
                    <p className="text-sm leading-relaxed">{signal.reasoning}</p>
                  </div>
                )}

                {/* Alternative Scenarios */}
                {signal.altScenarios && (
                  <div className="mb-4 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200/50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Risk Scenarios</span>
                    </div>
                    <div className="space-y-2">
                      {signal.altScenarios.ifBullish && (
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                          <div>
                            <div className="text-xs font-medium text-green-600">Bullish Case</div>
                            <div className="text-xs text-muted-foreground">{signal.altScenarios.ifBullish}</div>
                          </div>
                        </div>
                      )}
                      {signal.altScenarios.ifBearish && (
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                          <div>
                            <div className="text-xs font-medium text-red-600">Bearish Case</div>
                            <div className="text-xs text-muted-foreground">{signal.altScenarios.ifBearish}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signal Metadata */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {signal.source || 'AI Algorithm'}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button 
                    className={`flex-1 font-medium ${
                      signal.action === "BUY" 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    onClick={() => executeSignalMutation.mutate(signal.id)}
                    disabled={executeSignalMutation.isPending}
                  >
                    {executeSignalMutation.isPending ? "Executing..." : `Execute ${signal.action}`}
                  </Button>
                  <Button variant="outline" className="px-6">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <TradeConfirmationModal 
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        trade={lastTrade}
      />
      </div>
    </NewPageLayout>
  );
}