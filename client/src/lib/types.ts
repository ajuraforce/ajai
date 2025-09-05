export interface TradingSignal {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  price: string;
  targetPrice?: string;
  stopLoss?: string;
  confidence: string;
  reasoning?: string;
  source: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  type: "LONG" | "SHORT";
  quantity: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercent: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  totalValue: string;
  todayChange: string;
  todayChangePercent: string;
  activePositions: number;
  winRate: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  url?: string;
  source: string;
  publishedAt: string;
  sentiment?: string;
  sentimentScore?: string;
  relevanceScore?: string;
  createdAt: string;
}

export interface MarketData {
  id: string;
  symbol: string;
  price: string;
  volume?: string;
  change?: string;
  changePercent?: string;
  timestamp: string;
}

export interface RiskMetrics {
  id: string;
  portfolioId: string;
  portfolioRisk: string;
  portfolioRiskScore: string;
  diversification: string;
  diversificationScore: string;
  volatility: string;
  volatilityScore: string;
  recommendations?: any[];
  createdAt: string;
}
