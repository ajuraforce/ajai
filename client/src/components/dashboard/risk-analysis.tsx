import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function RiskAnalysis() {
  const { data: riskMetrics, isLoading } = useQuery({
    queryKey: ["/api/risk-metrics"],
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Risk Analysis</h3>
        </div>
        <div className="p-6 space-y-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "text-chart-1";
      case "medium":
        return "text-chart-2";
      case "high":
        return "text-chart-5";
      default:
        return "text-muted-foreground";
    }
  };

  const getProgressColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "bg-chart-1";
      case "medium":
        return "bg-chart-2";
      case "high":
        return "bg-chart-5";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Risk Analysis</h3>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Portfolio Risk</span>
            <span className={`text-sm font-medium ${getRiskColor(riskMetrics?.portfolioRisk)}`} data-testid="risk-portfolio-level">
              {riskMetrics?.portfolioRisk || "Medium"}
            </span>
          </div>
          <Progress 
            value={parseFloat(riskMetrics?.portfolioRiskScore || "60")} 
            className="h-2"
            data-testid="risk-portfolio-progress"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Diversification</span>
            <span className={`text-sm font-medium ${getRiskColor(riskMetrics?.diversification)}`} data-testid="risk-diversification-level">
              {riskMetrics?.diversification || "Good"}
            </span>
          </div>
          <Progress 
            value={parseFloat(riskMetrics?.diversificationScore || "78")} 
            className="h-2"
            data-testid="risk-diversification-progress"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Volatility</span>
            <span className={`text-sm font-medium ${getRiskColor(riskMetrics?.volatility)}`} data-testid="risk-volatility-level">
              {riskMetrics?.volatility || "High"}
            </span>
          </div>
          <Progress 
            value={parseFloat(riskMetrics?.volatilityScore || "85")} 
            className="h-2"
            data-testid="risk-volatility-progress"
          />
        </div>
        
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3">Risk Recommendations</h4>
          <div className="space-y-2 text-sm">
            {riskMetrics?.recommendations ? (
              Array.isArray(riskMetrics.recommendations) ? 
                riskMetrics.recommendations.map((rec: any, index: number) => (
                  <div key={index} className="flex items-start space-x-2" data-testid={`risk-recommendation-${index}`}>
                    <div className="w-1.5 h-1.5 bg-chart-2 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-muted-foreground">{rec.text || rec}</span>
                  </div>
                )) : null
            ) : (
              <>
                <div className="flex items-start space-x-2" data-testid="risk-recommendation-0">
                  <div className="w-1.5 h-1.5 bg-chart-2 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Consider reducing crypto exposure</span>
                </div>
                <div className="flex items-start space-x-2" data-testid="risk-recommendation-1">
                  <div className="w-1.5 h-1.5 bg-chart-1 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Increase defensive positions</span>
                </div>
                <div className="flex items-start space-x-2" data-testid="risk-recommendation-2">
                  <div className="w-1.5 h-1.5 bg-chart-2 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Set tighter stop-losses</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
