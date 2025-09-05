import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";

export default function TradeHistory() {
  const { data: trades = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/trades"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border border-border">
        <div className="p-4 sm:p-6 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold">Recent Trades</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-border animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Recent Trades</h3>
          <div className="hidden sm:flex items-center space-x-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last 10 trades</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 space-y-3 max-h-80 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>No trades executed yet</div>
            <div className="text-xs mt-1">Execute signals to see trade history</div>
          </div>
        ) : (
          trades.map((trade: any) => (
            <div 
              key={trade.id} 
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30 hover:bg-muted/20 transition-colors"
              data-testid={`trade-${trade.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`text-lg ${trade.action === "BUY" ? "text-green-600" : "text-red-600"}`}>
                  {trade.action === "BUY" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-medium" data-testid={`trade-symbol-${trade.id}`}>
                    {trade.symbol}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(trade.executedAt))} ago</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge 
                    className={`text-xs ${trade.action === "BUY" ? "bg-green-500" : "bg-red-500"} text-white`}
                    data-testid={`trade-action-${trade.id}`}
                  >
                    {trade.action} {trade.quantity}
                  </Badge>
                </div>
                <div className="text-sm font-medium" data-testid={`trade-price-${trade.id}`}>
                  ${parseFloat(trade.filledPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Slippage: {trade.slippage}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}