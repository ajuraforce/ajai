import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotificationHelpers } from "@/components/ui/notification-system";
import { formatDistanceToNow } from "date-fns";
import TradeConfirmationModal from "@/components/ui/trade-confirmation-modal";

export default function TradingSignals() {
  const { toast } = useToast();
  const { tradeExecuted, signalGenerated } = useNotificationHelpers();
  const queryClient = useQueryClient();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [lastTrade, setLastTrade] = useState<any>(null);
  
  const { data: signals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/signals"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const executeSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const response = await apiRequest("POST", `/api/signals/execute/${signalId}`);
      return response.json();
    },
    onSuccess: (data) => {
      // Show trade confirmation modal and notification
      setLastTrade(data.tradeExecution);
      setShowConfirmationModal(true);
      
      // Send notification
      tradeExecuted(
        data.tradeExecution.symbol,
        data.tradeExecution.action,
        data.tradeExecution.filledPrice
      );
      
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: "Failed to execute trading signal",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="lg:col-span-2">
        <Card className="border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Live Trading Signals</h3>
          </div>
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-border animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="border border-border">
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold">Live Trading Signals</h3>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="status-indicator status-online pulse-dot"></span>
              <span className="text-sm text-muted-foreground">Real-time AI Analysis</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          {signals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">⚡ No active signals</div>
              <div className="text-xs">AI is analyzing market conditions...</div>
            </div>
          ) : (
            signals.map((signal: any) => (
              <div 
                key={signal.id} 
                className={`relative p-4 rounded-xl border-2 ${
                  signal.action === "BUY" 
                    ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20" 
                    : "border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
                } hover:shadow-lg transition-all duration-200`}
                data-testid={`signal-${signal.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl ${
                      signal.action === "BUY" ? "text-green-600" : "text-red-600"
                    }`}>
                      {signal.action === "BUY" ? "📈" : "📉"}
                    </div>
                    <div>
                      <div className="font-bold text-lg" data-testid={`signal-symbol-${signal.id}`}>
                        {signal.symbol}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(signal.createdAt))} ago
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      className={`text-sm font-bold px-3 py-1 ${
                        signal.action === "BUY" 
                          ? "bg-green-500 text-white" 
                          : "bg-red-500 text-white"
                      }`}
                      data-testid={`signal-action-${signal.id}`}
                    >
                      {signal.action}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {signal.confidence}% confidence
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Entry Price</div>
                    <div className="font-bold" data-testid={`signal-price-${signal.id}`}>
                      ${parseFloat(signal.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {signal.targetPrice && (
                    <div>
                      <div className="text-xs text-muted-foreground">Target</div>
                      <div className="font-medium text-green-600">
                        ${parseFloat(signal.targetPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  {signal.stopLoss && (
                    <div>
                      <div className="text-xs text-muted-foreground">Stop Loss</div>
                      <div className="font-medium text-red-600">
                        ${parseFloat(signal.stopLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Potential</div>
                    <div className="font-medium text-blue-600">
                      {signal.targetPrice ? 
                        `+${(((parseFloat(signal.targetPrice) - parseFloat(signal.price)) / parseFloat(signal.price)) * 100).toFixed(1)}%` :
                        "N/A"
                      }
                    </div>
                  </div>
                </div>
                
                {signal.reasoning && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">💡 AI Analysis</div>
                    <div className="text-sm">{signal.reasoning}</div>
                  </div>
                )}

                {/* Enhanced Alternative Scenarios */}
                {signal.altScenarios && (
                  <div className="mb-4 p-3 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200/50">
                    <div className="text-xs font-medium text-foreground mb-2">🎯 Risk Scenarios</div>
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
                      {signal.altScenarios.ifNeutral && (
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                          <div>
                            <div className="text-xs font-medium text-yellow-600">Neutral Case</div>
                            <div className="text-xs text-muted-foreground">{signal.altScenarios.ifNeutral}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {signal.newsId && (
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium">📰 Generated from news analysis</div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    className={`flex-1 font-medium ${
                      signal.action === "BUY" 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                    onClick={() => executeSignalMutation.mutate(signal.id)}
                    disabled={executeSignalMutation.isPending}
                    data-testid={`button-execute-${signal.id}`}
                  >
                    {executeSignalMutation.isPending ? "Executing..." : `Execute ${signal.action}`}
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-4"
                    data-testid={`button-dismiss-${signal.id}`}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      
      <TradeConfirmationModal 
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        trade={lastTrade}
      />
    </div>
  );
}
