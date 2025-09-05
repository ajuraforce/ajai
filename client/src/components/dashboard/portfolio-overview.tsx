import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Zap, Award } from "lucide-react";

export default function PortfolioOverview() {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["/api/portfolio"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 sm:p-6 animate-pulse">
            <div className="h-4 bg-muted rounded mb-4"></div>
            <div className="h-8 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Card className="p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Portfolio</h3>
          <TrendingUp className="w-5 h-5 text-chart-1" />
        </div>
        <div className="space-y-2">
          <div className="text-xl sm:text-2xl font-bold number-font" data-testid="portfolio-total">
            ${parseFloat(portfolio?.totalValue || "0").toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-chart-1 text-sm font-medium" data-testid="portfolio-change">
              +${parseFloat(portfolio?.todayChange || "0").toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-chart-1 text-sm" data-testid="portfolio-change-percent">
              (+{portfolio?.todayChangePercent || "0"}%)
            </span>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Active Positions</h3>
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2">
          <div className="text-xl sm:text-2xl font-bold number-font" data-testid="active-positions">
            {portfolio?.activePositions || 0}
          </div>
          <div className="text-sm text-muted-foreground">5 profitable positions</div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">AI Signals Today</h3>
          <Zap className="w-5 h-5 text-chart-2" />
        </div>
        <div className="space-y-2">
          <div className="text-xl sm:text-2xl font-bold number-font" data-testid="signals-today">23</div>
          <div className="text-sm text-muted-foreground">18 buy • 5 sell</div>
        </div>
      </Card>
      
      <Card className="p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Win Rate</h3>
          <Award className="w-5 h-5 text-chart-1" />
        </div>
        <div className="space-y-2">
          <div className="text-xl sm:text-2xl font-bold number-font" data-testid="win-rate">
            {portfolio?.winRate || "0"}%
          </div>
          <div className="text-sm text-muted-foreground">Last 30 days</div>
        </div>
      </Card>
    </div>
  );
}
