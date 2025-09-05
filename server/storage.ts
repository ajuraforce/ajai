import { 
  type User, 
  type InsertUser, 
  type Portfolio, 
  type InsertPortfolio,
  type TradingSignal,
  type InsertTradingSignal,
  type Position,
  type InsertPosition,
  type NewsArticle,
  type InsertNewsArticle,
  type MarketData,
  type InsertMarketData,
  type RiskMetrics,
  type InsertRiskMetrics
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Portfolios
  getPortfolio(userId: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  
  // Trading Signals
  getTradingSignals(limit?: number): Promise<TradingSignal[]>;
  createTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal>;
  updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined>;
  
  // Positions
  getPositions(portfolioId?: string): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined>;
  closePosition(id: string): Promise<Position | undefined>;
  
  // News Articles
  getNewsArticles(limit?: number): Promise<NewsArticle[]>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  
  // Market Data
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  getLatestMarketData(): Promise<MarketData[]>;
  
  // Risk Metrics
  getRiskMetrics(portfolioId: string): Promise<RiskMetrics | undefined>;
  createRiskMetrics(metrics: InsertRiskMetrics): Promise<RiskMetrics>;
  updateRiskMetrics(portfolioId: string, updates: Partial<RiskMetrics>): Promise<RiskMetrics | undefined>;
  
  // Trade History
  getTrades(limit?: number): Promise<any[]>;
  createTrade(trade: any): Promise<any>;
  
  // Social Messages
  getSocialMessages?(limit?: number): Promise<any[]>;
  saveSocialMessages?(messages: any[]): Promise<void>;
  
  // Indian Market Data (Angel Broking)
  getIndianMarketData?(): Promise<any[]>;
  saveIndianMarketData?(data: any[]): Promise<void>;
  getIndianStock?(symbol: string): Promise<any | undefined>;
  
  // Telegram Messages
  getTelegramMessages?(limit?: number): Promise<any[]>;
  saveTelegramMessages?(messages: any[]): Promise<void>;
  
  // Fusion Signals (Combined AI signals)
  getFusionSignals?(limit?: number): Promise<any[]>;
  saveFusionSignal?(signal: any): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private portfolios: Map<string, Portfolio> = new Map();
  private tradingSignals: Map<string, TradingSignal> = new Map();
  private positions: Map<string, Position> = new Map();
  private newsArticles: Map<string, NewsArticle> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private riskMetrics: Map<string, RiskMetrics> = new Map();
  private trades: Map<string, any> = new Map();
  private socialMessages: Map<string, any> = new Map();
  private indianMarketData: Map<string, any> = new Map();
  private telegramMessages: Map<string, any> = new Map();
  private fusionSignals: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default user and portfolio
    const defaultUser: User = {
      id: "default-user",
      username: "trader",
      password: "$2b$10$demo.hash.for.development.only" // Demo BCrypt hash placeholder
    };
    this.users.set(defaultUser.id, defaultUser);

    const defaultPortfolio: Portfolio = {
      id: "default-portfolio",
      userId: defaultUser.id,
      totalValue: "127543.22",
      todayChange: "3247.18",
      todayChangePercent: "2.61",
      activePositions: 7,
      winRate: "73.2",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.portfolios.set(defaultPortfolio.id, defaultPortfolio);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser, id: randomUUID() };
    this.users.set(user.id, user);
    return user;
  }

  // Portfolios
  async getPortfolio(userId: string): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(p => p.userId === userId);
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const portfolio: Portfolio = {
      id: randomUUID(),
      userId: insertPortfolio.userId || null,
      totalValue: insertPortfolio.totalValue || "0",
      todayChange: insertPortfolio.todayChange || "0",
      todayChangePercent: insertPortfolio.todayChangePercent || "0",
      activePositions: insertPortfolio.activePositions || 0,
      winRate: insertPortfolio.winRate || "0",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.portfolios.set(portfolio.id, portfolio);
    return portfolio;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) return undefined;
    
    const updated = { ...portfolio, ...updates, updatedAt: new Date() };
    this.portfolios.set(id, updated);
    return updated;
  }

  // Trading Signals
  async getTradingSignals(limit = 10): Promise<TradingSignal[]> {
    return Array.from(this.tradingSignals.values())
      .filter(signal => signal.isActive)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createTradingSignal(insertSignal: InsertTradingSignal): Promise<TradingSignal> {
    const signal: TradingSignal = {
      id: randomUUID(),
      symbol: insertSignal.symbol,
      action: insertSignal.action,
      price: insertSignal.price,
      targetPrice: insertSignal.targetPrice || null,
      stopLoss: insertSignal.stopLoss || null,
      confidence: insertSignal.confidence,
      reasoning: insertSignal.reasoning || null,
      source: insertSignal.source || "AI",
      isActive: insertSignal.isActive ?? true,
      newsId: insertSignal.newsId || null,
      createdAt: new Date(),
      expiresAt: insertSignal.expiresAt || null
    };
    this.tradingSignals.set(signal.id, signal);
    return signal;
  }

  async updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined> {
    const signal = this.tradingSignals.get(id);
    if (!signal) return undefined;
    
    const updated = { ...signal, ...updates };
    this.tradingSignals.set(id, updated);
    return updated;
  }

  // Positions
  async getPositions(portfolioId?: string): Promise<Position[]> {
    if (portfolioId) {
      return Array.from(this.positions.values()).filter(p => p.portfolioId === portfolioId);
    }
    return Array.from(this.positions.values());
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const position: Position = {
      id: randomUUID(),
      portfolioId: insertPosition.portfolioId || null,
      symbol: insertPosition.symbol,
      type: insertPosition.type,
      quantity: insertPosition.quantity,
      entryPrice: insertPosition.entryPrice,
      currentPrice: insertPosition.currentPrice,
      pnl: insertPosition.pnl || "0",
      pnlPercent: insertPosition.pnlPercent || "0",
      status: insertPosition.status || "OPEN",
      openedAt: new Date(),
      closedAt: insertPosition.closedAt || null
    };
    this.positions.set(position.id, position);
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;
    
    const updated = { ...position, ...updates };
    this.positions.set(id, updated);
    return updated;
  }

  async closePosition(id: string): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;
    
    const updated = { ...position, status: "CLOSED", closedAt: new Date() };
    this.positions.set(id, updated);
    return updated;
  }

  // News Articles
  async getNewsArticles(limit = 10): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
  }

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const article: NewsArticle = {
      id: randomUUID(),
      title: insertArticle.title,
      summary: insertArticle.summary || null,
      content: insertArticle.content || null,
      url: insertArticle.url || null,
      source: insertArticle.source,
      publishedAt: insertArticle.publishedAt,
      sentiment: insertArticle.sentiment || null,
      sentimentScore: insertArticle.sentimentScore || null,
      relevanceScore: insertArticle.relevanceScore || null,
      aiAnalysis: insertArticle.aiAnalysis || null,
      isDeepAnalyzed: insertArticle.isDeepAnalyzed ?? false,
      createdAt: new Date()
    };
    this.newsArticles.set(article.id, article);
    return article;
  }

  // Market Data
  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    return Array.from(this.marketData.values())
      .filter(data => data.symbol === symbol)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())[0];
  }

  async createMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const data: MarketData = {
      id: randomUUID(),
      symbol: insertData.symbol,
      price: insertData.price,
      volume: insertData.volume || null,
      change: insertData.change || null,
      changePercent: insertData.changePercent || null,
      timestamp: new Date()
    };
    this.marketData.set(data.id, data);
    return data;
  }

  async getLatestMarketData(): Promise<MarketData[]> {
    const symbols = new Set(Array.from(this.marketData.values()).map(d => d.symbol));
    return Array.from(symbols).map(symbol => {
      return Array.from(this.marketData.values())
        .filter(data => data.symbol === symbol)
        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())[0];
    }).filter(Boolean);
  }

  // Risk Metrics
  async getRiskMetrics(portfolioId: string): Promise<RiskMetrics | undefined> {
    return Array.from(this.riskMetrics.values())
      .filter(metrics => metrics.portfolioId === portfolioId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
  }

  async createRiskMetrics(insertMetrics: InsertRiskMetrics): Promise<RiskMetrics> {
    const metrics: RiskMetrics = {
      id: randomUUID(),
      portfolioId: insertMetrics.portfolioId || null,
      portfolioRisk: insertMetrics.portfolioRisk,
      portfolioRiskScore: insertMetrics.portfolioRiskScore,
      diversification: insertMetrics.diversification,
      diversificationScore: insertMetrics.diversificationScore,
      volatility: insertMetrics.volatility,
      volatilityScore: insertMetrics.volatilityScore,
      recommendations: insertMetrics.recommendations || null,
      createdAt: new Date()
    };
    this.riskMetrics.set(metrics.id, metrics);
    return metrics;
  }

  async updateRiskMetrics(portfolioId: string, updates: Partial<RiskMetrics>): Promise<RiskMetrics | undefined> {
    const existing = await this.getRiskMetrics(portfolioId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.riskMetrics.set(existing.id, updated);
    return updated;
  }
  
  // Trade History
  async getTrades(limit = 10): Promise<any[]> {
    return Array.from(this.trades.values())
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit);
  }

  async createTrade(trade: any): Promise<any> {
    const tradeRecord = {
      ...trade,
      id: trade.id || randomUUID(),
      executedAt: trade.executedAt || new Date().toISOString()
    };
    this.trades.set(tradeRecord.id, tradeRecord);
    return tradeRecord;
  }
  
  async getSocialMessages(limit: number = 100): Promise<any[]> {
    const messages = Array.from(this.socialMessages.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return limit ? messages.slice(0, limit) : messages;
  }
  
  async saveSocialMessages(messages: any[]): Promise<void> {
    messages.forEach(message => {
      this.socialMessages.set(message.id, {
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
      });
    });
  }

  // Indian Market Data methods
  async getIndianMarketData(): Promise<any[]> {
    return Array.from(this.indianMarketData.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async saveIndianMarketData(data: any[]): Promise<void> {
    data.forEach(item => {
      this.indianMarketData.set(item.symbol, {
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp)
      });
    });
  }

  async getIndianStock(symbol: string): Promise<any | undefined> {
    return this.indianMarketData.get(symbol);
  }

  // Telegram Messages methods
  async getTelegramMessages(limit: number = 50): Promise<any[]> {
    return Array.from(this.telegramMessages.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async saveTelegramMessages(messages: any[]): Promise<void> {
    messages.forEach(message => {
      this.telegramMessages.set(message.id, {
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)
      });
    });
  }

  // Fusion Signals methods
  async getFusionSignals(limit: number = 20): Promise<any[]> {
    return Array.from(this.fusionSignals.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async saveFusionSignal(signal: any): Promise<void> {
    const id = signal.id || randomUUID();
    this.fusionSignals.set(id, {
      ...signal,
      id,
      timestamp: signal.timestamp instanceof Date ? signal.timestamp : new Date(signal.timestamp || Date.now())
    });
  }
}

export const storage = new MemStorage();
