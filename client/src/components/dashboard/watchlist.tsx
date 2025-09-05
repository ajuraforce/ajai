import { useState } from "react";
import { usePreferences } from "@/contexts/preferences-context";
import { useNotificationHelpers } from "@/components/ui/notification-system";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Star, TrendingUp, TrendingDown } from "lucide-react";

export default function Watchlist() {
  const { preferences, addToWatchlist, removeFromWatchlist } = usePreferences();
  const { success, error } = useNotificationHelpers();
  const [newSymbol, setNewSymbol] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSymbol = () => {
    if (!newSymbol.trim()) {
      error("Please enter a valid symbol");
      return;
    }

    const symbol = newSymbol.trim().toUpperCase();
    
    if (preferences.watchlist.includes(symbol)) {
      error(`${symbol} is already in your watchlist`);
      return;
    }

    if (preferences.watchlist.length >= 20) {
      error("Maximum 20 symbols allowed in watchlist");
      return;
    }

    addToWatchlist(symbol);
    success(`Added ${symbol} to watchlist`);
    setNewSymbol("");
    setIsAdding(false);
  };

  const handleRemoveSymbol = (symbol: string) => {
    removeFromWatchlist(symbol);
    success(`Removed ${symbol} from watchlist`);
  };

  const getMockPrice = (symbol: string) => {
    // Generate consistent mock prices based on symbol
    const seed = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const basePrice = 100 + (seed % 400);
    const volatility = (Math.sin(seed) + 1) * 0.05; // 0-10% change
    const change = (Math.cos(seed * 2) * volatility);
    
    return {
      price: basePrice * (1 + change),
      changePercent: change * 100,
      isPositive: change >= 0
    };
  };

  return (
    <Card className="border border-border">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h3 className="text-base sm:text-lg font-semibold">Watchlist</h3>
            <Badge variant="outline" className="text-xs">
              {preferences.watchlist.length}/20
            </Badge>
          </div>
          
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs"
            data-testid="button-add-to-watchlist"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Symbol
          </Button>
        </div>
        
        {isAdding && (
          <div className="flex space-x-2 mt-4">
            <Input
              placeholder="e.g., AAPL, BTC/USD"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymbol()}
              className="text-sm"
              data-testid="input-new-symbol"
            />
            <Button size="sm" onClick={handleAddSymbol} data-testid="button-confirm-add">
              Add
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setIsAdding(false);
                setNewSymbol("");
              }}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      
      <div className="p-4 sm:p-6 space-y-2 max-h-80 overflow-y-auto">
        {preferences.watchlist.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div>No symbols in watchlist</div>
            <div className="text-xs mt-1">Add symbols to track their performance</div>
          </div>
        ) : (
          preferences.watchlist.map((symbol) => {
            const mockData = getMockPrice(symbol);
            
            return (
              <div
                key={symbol}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30 hover:bg-muted/20 transition-colors"
                data-testid={`watchlist-item-${symbol}`}
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium" data-testid={`symbol-${symbol}`}>
                      {symbol}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${mockData.price.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 text-sm ${
                    mockData.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mockData.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span data-testid={`change-${symbol}`}>
                      {mockData.changePercent >= 0 ? '+' : ''}{mockData.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSymbol(symbol)}
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                    data-testid={`button-remove-${symbol}`}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}