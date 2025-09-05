import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Target, BarChart3 } from "lucide-react";

import { NewPageLayout } from "@/components/ui/new-navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";

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
      <ProtectedRoute>
        <NewPageLayout>
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
        </NewPageLayout>
      </ProtectedRoute>
    );
  }

  const totalValue = parseFloat((portfolio as any)?.totalValue || "0");
  const todayChange = parseFloat((portfolio as any)?.todayChange || "0");
  const todayChangePercent = parseFloat((portfolio as any)?.todayChangePercent || "0");
  const activePositions = parseInt((portfolio as any)?.activePositions || "0");
  const winRate = parseFloat((portfolio as any)?.winRate || "0");
  
  const positionsArray = Array.isArray(positions) ? positions : [];
  const totalPnL = positionsArray.reduce((sum: number, pos: any) => 
    sum + parseFloat(pos.pnl || "0"), 0);

  return (
    <ProtectedRoute>
      <NewPageLayout>
        <div className="container mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Portfolio Overview</h1>
            <Button variant="outline" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>

          {/* Portfolio Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <h3 className="text-2xl font-bold">${totalValue.toLocaleString()}</h3>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center">
                    {todayChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      todayChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {todayChange > 0 ? '+' : ''}${todayChange.toFixed(2)} 
                      ({todayChangePercent > 0 ? '+' : ''}{todayChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">today</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Positions</p>
                    <h3 className="text-2xl font-bold">{activePositions}</h3>
                  </div>
                  <PieChart className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <Target className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium text-blue-600">
                      {winRate}% Win Rate
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <h3 className={`text-2xl font-bold ${
                      totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                    </h3>
                  </div>
                  {totalPnL >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  )}
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-xs">
                    All Time
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Positions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Active Positions</span>
                <Badge variant="secondary">{positions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positionsArray.length > 0 ? (
                <div className="space-y-4">
                  {positionsArray.map((position: any) => (
                    <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            position.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <h4 className="font-semibold">{position.symbol}</h4>
                            <p className="text-sm text-muted-foreground">
                              {position.side} • {position.quantity} shares @ ${parseFloat(position.entryPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center mx-6">
                        <div className="text-sm text-muted-foreground">Current</div>
                        <div className="font-semibold">${parseFloat(position.currentPrice).toFixed(2)}</div>
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
      </NewPageLayout>
    </ProtectedRoute>
  );
}