import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

interface TradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: {
    id: string;
    symbol: string;
    action: string;
    quantity: string;
    entryPrice: string;
    filledPrice: string;
    slippage: string;
    executedAt: string;
    estimatedImpact: string;
  } | null;
}

export default function TradeConfirmationModal({ isOpen, onClose, trade }: TradeConfirmationModalProps) {
  if (!trade) return null;

  const slippageAmount = parseFloat(trade.slippage);
  const priceImpact = ((parseFloat(trade.filledPrice) - parseFloat(trade.entryPrice)) / parseFloat(trade.entryPrice)) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <span>Trade Executed Successfully</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`text-2xl ${trade.action === "BUY" ? "text-green-600" : "text-red-600"}`}>
                {trade.action === "BUY" ? "📈" : "📉"}
              </div>
              <div>
                <div className="font-bold text-lg">{trade.symbol}</div>
                <Badge 
                  className={`${trade.action === "BUY" ? "bg-green-500" : "bg-red-500"} text-white`}
                >
                  {trade.action} {trade.quantity}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Filled Price</div>
              <div className="font-bold text-lg">${parseFloat(trade.filledPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Entry Price</span>
              </div>
              <div className="font-medium">${parseFloat(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Executed At</span>
              </div>
              <div className="font-medium">{new Date(trade.executedAt).toLocaleTimeString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Slippage</span>
              <span className={`font-medium ${slippageAmount > 0.1 ? "text-orange-600" : "text-green-600"}`}>
                {slippageAmount.toFixed(3)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price Impact</span>
              <span className={`font-medium flex items-center space-x-1 ${priceImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                {priceImpact >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(priceImpact).toFixed(2)}%</span>
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Portfolio Impact</span>
              <span className="font-medium text-blue-600">{trade.estimatedImpact}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={onClose} 
              className="w-full"
              data-testid="button-close-confirmation"
            >
              Continue Trading
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}