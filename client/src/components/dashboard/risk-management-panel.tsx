import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Calculator, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  PieChart,
  Target
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useNotificationHelpers } from '@/components/ui/notification-system';

interface RiskCalculation {
  maxPositionSize: number;
  maxInvestment: number;
  maxRiskAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskTolerancePercent: number;
  portfolioValue: number;
  tradeRiskPerUnit: number;
  message: string;
}

interface PortfolioRisk {
  portfolioValue: number;
  cashAllocation: number;
  positionsAllocation: number;
  totalPositions: number;
  largestPositionPercent: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
}

export default function RiskManagementPanel() {
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [riskTolerance, setRiskTolerance] = useState(2);
  const { success, error } = useNotificationHelpers();
  const queryClient = useQueryClient();

  // Fetch portfolio risk metrics
  const { data: portfolioRisk, isLoading: riskLoading } = useQuery({
    queryKey: ['/api/risk/portfolio'],
    retry: false
  });

  // Calculate position size mutation
  const calculateRiskMutation = useMutation({
    mutationFn: async (data: { entryPrice: number; stopLossPrice: number; riskTolerancePercent: number }) => {
      return await apiRequest('/api/risk/calculate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      success('Position size calculated successfully');
    },
    onError: (err) => {
      error('Failed to calculate position size: ' + (err as Error).message);
    }
  });

  const handleCalculateRisk = () => {
    const entry = parseFloat(entryPrice);
    const stopLoss = parseFloat(stopLossPrice);

    if (!entry || !stopLoss) {
      error('Please enter valid entry and stop-loss prices');
      return;
    }

    if (entry === stopLoss) {
      error('Entry and stop-loss prices cannot be the same');
      return;
    }

    calculateRiskMutation.mutate({
      entryPrice: entry,
      stopLossPrice: stopLoss,
      riskTolerancePercent: riskTolerance
    });
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-500 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const riskResult = calculateRiskMutation.data as RiskCalculation | undefined;

  return (
    <div className="space-y-6">
      {/* Portfolio Risk Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Portfolio Risk Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading risk metrics...</p>
            </div>
          ) : portfolioRisk ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">${portfolioRisk.portfolioValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
              </div>
              
              <div className="text-center">
                <PieChart className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{portfolioRisk.cashAllocation}%</p>
                <p className="text-sm text-muted-foreground">Cash Allocation</p>
              </div>
              
              <div className="text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{portfolioRisk.totalPositions}</p>
                <p className="text-sm text-muted-foreground">Total Positions</p>
              </div>
              
              <div className="text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{portfolioRisk.largestPositionPercent}%</p>
                <p className="text-sm text-muted-foreground">Largest Position</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No risk data available</p>
          )}

          {portfolioRisk && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Level:</span>
                <Badge className={getRiskColor(portfolioRisk.riskLevel)}>
                  {portfolioRisk.riskLevel}
                </Badge>
              </div>
              
              {portfolioRisk.recommendations.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {portfolioRisk.recommendations.map((rec, index) => (
                        <p key={index} className="text-sm">• {rec}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position Size Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary" />
            <span>Position Size Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price ($)</Label>
              <Input
                id="entryPrice"
                type="number"
                placeholder="50.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                data-testid="input-entry-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stopLossPrice">Stop Loss ($)</Label>
              <Input
                id="stopLossPrice"
                type="number"
                placeholder="45.00"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                data-testid="input-stop-loss-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="riskTolerance">Risk Tolerance (%)</Label>
              <Input
                id="riskTolerance"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(parseFloat(e.target.value) || 2)}
                data-testid="input-risk-tolerance"
              />
            </div>
          </div>

          <Button 
            onClick={handleCalculateRisk}
            disabled={calculateRiskMutation.isPending}
            className="w-full md:w-auto"
            data-testid="button-calculate-risk"
          >
            {calculateRiskMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Position Size
              </>
            )}
          </Button>

          {riskResult && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Position Size Recommendation</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-background rounded border">
                  <p className="text-lg font-bold text-green-600">
                    ${riskResult.maxInvestment.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Max Investment</p>
                </div>
                
                <div className="text-center p-3 bg-background rounded border">
                  <p className="text-lg font-bold text-blue-600">
                    {riskResult.maxPositionSize.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Max Position Size</p>
                </div>
                
                <div className="text-center p-3 bg-background rounded border">
                  <p className="text-lg font-bold text-orange-600">
                    ${riskResult.maxRiskAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Max Risk Amount</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Trade Risk Level:</span>
                <Badge className={getRiskColor(riskResult.riskLevel)}>
                  {riskResult.riskLevel}
                </Badge>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {riskResult.message}
                </AlertDescription>
              </Alert>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Portfolio Value: ${riskResult.portfolioValue.toLocaleString()}</p>
                <p>• Risk per Unit: ${riskResult.tradeRiskPerUnit.toFixed(2)}</p>
                <p>• Risk Tolerance: {riskResult.riskTolerancePercent}% of portfolio</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}