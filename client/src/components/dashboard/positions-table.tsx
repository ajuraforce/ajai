import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PositionsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["/api/positions"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const closePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const response = await apiRequest("POST", `/api/positions/${positionId}/close`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Position Closed",
        description: `Successfully closed position for ${data.symbol}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
    onError: (error) => {
      toast({
        title: "Close Failed",
        description: "Failed to close position",
        variant: "destructive",
      });
    },
  });

  const getSymbolShort = (symbol: string) => {
    if (symbol.includes("/")) {
      return symbol.split("/")[0];
    }
    return symbol.length > 4 ? symbol.substring(0, 4) : symbol;
  };

  const getPnlColor = (pnl: string) => {
    const value = parseFloat(pnl);
    return value >= 0 ? "text-chart-1" : "text-chart-5";
  };

  if (isLoading) {
    return (
      <Card className="border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Current Positions</h3>
        </div>
        <div className="p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const openPositions = positions.filter((pos: any) => pos.status === "OPEN");

  return (
    <Card className="border border-border">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Current Positions</h3>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
            data-testid="button-view-all-positions"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {openPositions.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-muted-foreground">
            No open positions
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">P&L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {openPositions.map((position: any) => (
                <tr 
                  key={position.id} 
                  className="hover:bg-muted/20 transition-colors"
                  data-testid={`position-row-${position.id}`}
                >
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-primary" data-testid={`position-symbol-short-${position.id}`}>
                          {getSymbolShort(position.symbol)}
                        </span>
                      </div>
                      <span className="font-medium number-font" data-testid={`position-symbol-${position.id}`}>
                        {position.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={position.type === "LONG" ? "default" : "destructive"}
                        className={position.type === "LONG" 
                          ? "bg-chart-1/20 text-chart-1 border-chart-1/30" 
                          : "bg-chart-5/20 text-chart-5 border-chart-5/30"
                        }
                        data-testid={`position-type-${position.id}`}
                      >
                        {position.type}
                      </Badge>
                      <span className="text-sm number-font" data-testid={`position-quantity-${position.id}`}>
                        {position.quantity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm number-font" data-testid={`position-entry-price-${position.id}`}>
                    ${parseFloat(position.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm number-font" data-testid={`position-current-price-${position.id}`}>
                    ${parseFloat(position.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium number-font ${getPnlColor(position.pnl)}`} data-testid={`position-pnl-${position.id}`}>
                        {parseFloat(position.pnl) >= 0 ? "+" : ""}${parseFloat(position.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-sm ${getPnlColor(position.pnl)}`} data-testid={`position-pnl-percent-${position.id}`}>
                        ({parseFloat(position.pnlPercent) >= 0 ? "+" : ""}{parseFloat(position.pnlPercent).toFixed(2)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="bg-chart-5/20 text-chart-5 hover:bg-chart-5/30 border-chart-5/30"
                      onClick={() => closePositionMutation.mutate(position.id)}
                      disabled={closePositionMutation.isPending}
                      data-testid={`button-close-position-${position.id}`}
                    >
                      {closePositionMutation.isPending ? "Closing..." : "Close"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
