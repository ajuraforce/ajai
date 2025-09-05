import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Target, BarChart3 } from "lucide-react";

import { PageLayout } from "@/components/ui/main-navigation";

export default function Portfolio() {
  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ["/api/portfolio"],
    refetchInterval: 30000,
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["/api/positions"],
    refetchInterval: 30000,
  });

  const isLoading = portfolioLoading || positionsLoading;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Portfolio</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  const totalValue = parseFloat(portfolio?.totalValue || "0");
  const todayChange = parseFloat(portfolio?.todayChange || "0");
  const todayChangePercent = parseFloat(portfolio?.todayChangePercent || "0");
  const activePositions = portfolio?.activePositions || 0;
  const winRate = parseFloat(portfolio?.winRate || "0");

  const totalPnL = positions.reduce((sum: number, pos: any) => 
    sum + parseFloat(pos.pnl || "0"), 0);

  return (
    <PageLayout>
      <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Portfolio Overview</h1>
        <Button variant="outline" className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </Button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Value</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <div className={`text-sm flex items-center space-x-1 ${
                todayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {todayChangePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {todayChangePercent > 0 ? '+' : ''}{todayChangePercent.toFixed(2)}% today
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Total P&L</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${
                totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${totalPnL > 0 ? '+' : ''}{totalPnL.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Realized + Unrealized</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Active Positions</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{activePositions}</div>
              <div className="text-sm text-muted-foreground">Open trades</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">Win Rate</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position: any) => (
                <div 
                  key={position.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-semibold">{position.symbol}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant={position.type === 'LONG' ? 'default' : 'secondary'}>
                          {position.type}
                        </Badge>
                        <span>Qty: {position.quantity}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      Entry: ${parseFloat(position.entryPrice).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current: ${parseFloat(position.currentPrice).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-semibold ${
                      parseFloat(position.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(position.pnl) > 0 ? '+' : ''}${parseFloat(position.pnl).toFixed(2)}
                    </div>
                    <div className={`text-sm ${
                      parseFloat(position.pnlPercent) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(position.pnlPercent) > 0 ? '+' : ''}{parseFloat(position.pnlPercent).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Close
                    </Button>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Active Positions</h3>
              <p>Start trading to see your positions here</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}