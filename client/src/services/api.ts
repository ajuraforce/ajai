import { apiRequest } from "@/lib/queryClient";

export const tradingApi = {
  // Portfolio
  getPortfolio: () => 
    apiRequest("GET", "/api/portfolio").then(res => res.json()),
  
  // Trading Signals
  getSignals: () => 
    apiRequest("GET", "/api/signals").then(res => res.json()),
  
  executeSignal: (signalId: string) =>
    apiRequest("POST", `/api/signals/execute/${signalId}`).then(res => res.json()),
  
  // Positions
  getPositions: () =>
    apiRequest("GET", "/api/positions").then(res => res.json()),
  
  closePosition: (positionId: string) =>
    apiRequest("POST", `/api/positions/${positionId}/close`).then(res => res.json()),
  
  // News
  getNews: () =>
    apiRequest("GET", "/api/news").then(res => res.json()),
  
  // Market Data
  getMarketData: () =>
    apiRequest("GET", "/api/market-data").then(res => res.json()),
  
  // Risk Metrics
  getRiskMetrics: () =>
    apiRequest("GET", "/api/risk-metrics").then(res => res.json()),
};
