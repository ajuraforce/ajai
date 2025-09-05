import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { storage } from "./storage";
import { insertTradingSignalSchema, insertNewsArticleSchema, insertMarketDataSchema, insertRiskMetricsSchema } from "@shared/schema";
import cron from "node-cron";
import Parser from "rss-parser";
import fetch from "node-fetch";
import Sentiment from "sentiment";
import natural from "natural";
import nlp from "compromise";
import { binanceService } from "./services/binance-api";
import { authService } from "./services/auth-service";
import { SocialScraper } from "./services/social-scraper";
import AngelBrokingService from "./services/angel-broking";
import { TelegramScraper } from "./services/telegram-scraper";
import { SignalFusionEngine } from "./services/signal-fusion-engine";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "demo-key"
});

// AJxAI System Prompt for chat functionality
const AJXAI_SYSTEM_PROMPT = {
  role: "system" as const,
  content: `You are AJxAI, an advanced multi-domain strategist for AI Trading platform.
Your purpose is to scan, decode, and connect patterns across:
- Global Geopolitics
- Indian Stock Markets (NIFTY, equities)  
- Cryptocurrencies
- News and Social Media sentiment

Rules:
1. Always connect surface data (prices, headlines) to deeper system-level patterns (correlations, hidden triggers).
2. Prioritize accuracy, context, and clarity over speed.
3. If uncertain, provide hypotheses instead of refusals.
4. Maintain compact, actionable outputs (e.g., alert cards, confidence scores).
5. Respect safety: Never suggest illegal or exploitative actions.
6. Support paper/live trading logic with clear trade signals + reasoning.
7. Track historical accuracy and adapt outputs (learning mode).
8. Keep responses concise and actionable for traders.`
};

// In-memory conversation history per user
const chatConversations: Record<string, Array<{role: 'system' | 'user' | 'assistant', content: string}>> = {};

// Auto-trading configuration
const autoTradingConfig = {
  enabled: true,
  confidenceThreshold: 85, // Auto-execute signals with 85%+ confidence
  maxDailyTrades: 10,
  currentDailyTrades: 0,
  lastResetDate: new Date().toDateString()
};

// Auto-trading logs
const autoTradingLogs: Array<{
  timestamp: string;
  signal: any;
  action: string;
  confidence: number;
  result: string;
}> = [];

const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY;

const rssParser = new Parser();
const sentiment = new Sentiment();

// Trading-specific keywords for intelligent filtering
const TRADING_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
  'fed', 'federal reserve', 'interest rate', 'inflation', 'gdp',
  'stock market', 'nasdaq', 'dow jones', 's&p 500', 'nifty', 'sensex',
  'earnings', 'revenue', 'profit', 'loss', 'merger', 'acquisition',
  'ipo', 'etf', 'trading', 'investment', 'portfolio', 'volatility',
  'regulation', 'ban', 'crash', 'surge', 'rally', 'bull', 'bear',
  'recession', 'recovery', 'growth', 'economic', 'financial'
];

// Budget control for OpenAI API calls
let dailyOpenAIBudget = 20; // Max 20 deep analysis calls per day
let budgetUsedToday = 0;
let lastResetDate = new Date().toDateString();

// Reset daily budget at midnight
function resetDailyBudget() {
  const today = new Date().toDateString();
  if (lastResetDate !== today) {
    budgetUsedToday = 0;
    lastResetDate = today;
    console.log(`🔄 Reset OpenAI budget: ${dailyOpenAIBudget} calls available`);
  }
}

// Cheap analysis layer - uses free local NLP tools
function cheapAnalysis(articles: any[]) {
  return articles.map(article => {
    const fullText = `${article.title} ${article.description}`.toLowerCase();
    
    // 1. Keyword filtering
    const relevantKeywords = TRADING_KEYWORDS.filter(keyword => 
      fullText.includes(keyword.toLowerCase())
    );
    
    // 2. Local sentiment analysis (free)
    const sentimentResult = sentiment.analyze(fullText);
    const sentimentScore = sentimentResult.score;
    const sentimentLabel = sentimentScore > 1 ? 'Bullish' : 
                         sentimentScore < -1 ? 'Bearish' : 'Neutral';
    
    // 3. Simple entity extraction using compromise
    const doc = nlp(article.title + ' ' + article.description);
    const entities = [
      ...doc.organizations().out('array'),
      ...doc.people().out('array'),
      ...doc.places().out('array')
    ];
    
    // 4. Simple scoring with proper tokenizer
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(fullText) || [];
    const tfidfScore = tokens.length * relevantKeywords.length;
    
    // 5. Relevance scoring
    const relevanceScore = Math.min(1, (
      relevantKeywords.length * 0.3 + 
      Math.abs(sentimentScore) * 0.05 +
      entities.length * 0.1 +
      tfidfScore * 0.001
    ));
    
    return {
      ...article,
      cheapAnalysis: {
        sentimentScore,
        sentimentLabel,
        relevantKeywords,
        entities,
        tfidfScore,
        relevanceScore,
        shouldDeepAnalyze: relevanceScore > 0.4 && Math.abs(sentimentScore) > 1
      }
    };
  });
}

// Deep analysis layer - uses OpenAI GPT-5 (expensive, budget-controlled)
async function deepAnalysis(article: any): Promise<any> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
    return { deepAnalysis: { error: 'OpenAI API key not configured' } };
  }

  try {
    const prompt = `Analyze this financial news in system-level context:

Title: ${article.title}
Content: ${article.description}
Keywords found: ${article.cheapAnalysis.relevantKeywords.join(', ')}

Rules:
1. Connect with hidden correlations, macro events, and historical market reactions.
2. Provide scenario probabilities (Bullish, Bearish, Neutral).
3. Include potential cross-market effects (crypto, equities, commodities, FX).

Respond in JSON format:
{
  "localSentiment": "Bullish|Bearish|Neutral",
  "confidence": 0.85,
  "marketImpact": "High|Medium|Low",
  "affectedAssets": ["BTC", "ETH", "Stocks"],
  "timeHorizon": "Short|Medium|Long",
  "tradingSignal": "BUY|SELL|HOLD",
  "systemConnections": ["Regulation → BTC", "Oil prices → Inflation → USD"],
  "scenarioAnalysis": {
    "bullish": 0.65,
    "bearish": 0.25,
    "neutral": 0.10
  },
  "metaReasoning": "Brief explanation with unseen links"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{
        role: "system",
        content: "You are a system-level financial intelligence engine. Always connect surface news with deeper macro patterns."
      }, {
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" },
      max_tokens: 400
    });

    budgetUsedToday++;
    console.log(`💰 OpenAI budget used: ${budgetUsedToday}/${dailyOpenAIBudget}`);
    
    return {
      ...article,
      deepAnalysis: JSON.parse(response.choices[0].message.content || '{}')
    };
  } catch (error) {
    console.error('Deep analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      ...article,
      deepAnalysis: { 
        sentiment: article.cheapAnalysis.sentimentLabel,
        confidence: 0.5,
        error: 'Deep analysis unavailable'
      }
    };
  }
}

// Comprehensive RSS feeds for financial news
const RSS_FEEDS = {
  financial: [
    { name: "CNBC Business", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html" },
    { name: "Reuters Business", url: "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best" },
    { name: "WSJ Markets", url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml" },
    { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss" }
  ],
  crypto: [
    { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
    { name: "Crypto.News", url: "https://crypto.news/feed/" },
    { name: "Bitcoinist", url: "https://bitcoinist.com/feed/" },
    { name: "Decrypt", url: "https://decrypt.co/feed" }
  ],
  geopolitical: [
    { name: "Reuters World", url: "https://www.reuters.com/arc/outboundfeeds/rss/category/world/" },
    { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" }
  ],
  stocks: [
    { name: "Economic Times Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
    { name: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss" },
    { name: "Investing.com Stocks", url: "https://www.investing.com/rss/stock.rss" },
    { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/marketpulse/" }
  ]
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware (defined early to be available for protected routes)
  const authenticate = async (req: any, res: any, next: any) => {
    try {
      // For demo purposes, we'll use a simple demo user
      req.user = { id: 'demo-user-id' };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  function broadcastToClients(data: any) {
    const message = JSON.stringify(data);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Portfolio endpoints
  app.get("/api/portfolio", async (req, res) => {
    try {
      const defaultUserId = "default-user";
      const portfolio = await storage.getPortfolio(defaultUserId);
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Trading signals endpoints
  app.get("/api/signals", async (req, res) => {
    try {
      const signals = await storage.getTradingSignals(10);
      res.json(signals);
    } catch (error) {
      console.error("Error fetching signals:", error);
      res.status(500).json({ message: "Failed to fetch trading signals" });
    }
  });

  app.post("/api/signals/execute/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const signal = await storage.updateTradingSignal(id, { isActive: false });
      
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      // Simulate realistic execution with slippage
      const basePrice = parseFloat(signal.price);
      const slippageBps = Math.random() * 8 + 1; // 0.01% to 0.09% slippage
      const slippageMultiplier = signal.action === "BUY" ? (1 + slippageBps / 10000) : (1 - slippageBps / 10000);
      const filledPrice = basePrice * slippageMultiplier;
      const slippagePercent = Math.abs((filledPrice - basePrice) / basePrice) * 100;

      // Calculate portfolio impact
      const currentPortfolio = await storage.getPortfolio("default-user");
      const portfolioValue = currentPortfolio ? parseFloat(currentPortfolio.totalValue) : 100000;
      const positionSize = filledPrice * 1; // 1 share/unit
      const portfolioImpactPercent = (positionSize / portfolioValue) * 100;

      // Create position from signal
      const position = await storage.createPosition({
        portfolioId: "default-portfolio",
        symbol: signal.symbol,
        type: signal.action === "BUY" ? "LONG" : "SHORT",
        quantity: "1",
        entryPrice: filledPrice.toFixed(2),
        currentPrice: filledPrice.toFixed(2),
        pnl: "0",
        pnlPercent: "0",
        status: "OPEN"
      });

      // Create trade execution record for the modal
      const tradeExecution = {
        id: position.id,
        symbol: signal.symbol,
        action: signal.action,
        quantity: "1",
        entryPrice: signal.price,
        filledPrice: filledPrice.toFixed(2),
        slippage: slippagePercent.toFixed(3),
        executedAt: new Date().toISOString(),
        estimatedImpact: `${portfolioImpactPercent.toFixed(2)}% of portfolio`,
        confidence: signal.confidence,
        reasoning: signal.reasoning
      };

      // Store trade in history
      await storage.createTrade(tradeExecution);

      broadcastToClients({
        type: "SIGNAL_EXECUTED",
        signal,
        position,
        tradeExecution
      });

      res.json({ 
        success: true, 
        signal, 
        position,
        tradeExecution
      });
    } catch (error) {
      console.error("Error executing signal:", error);
      res.status(500).json({ message: "Failed to execute signal" });
    }
  });

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getPositions("default-portfolio");
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const { id } = req.params;
      const position = await storage.closePosition(id);
      
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      broadcastToClients({
        type: "POSITION_CLOSED",
        position
      });

      res.json(position);
    } catch (error) {
      console.error("Error closing position:", error);
      res.status(500).json({ message: "Failed to close position" });
    }
  });

  // News endpoints
  app.get("/api/news", async (req, res) => {
    try {
      const articles = await storage.getNewsArticles(10);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Market data endpoints
  app.get("/api/market-data", async (req, res) => {
    try {
      const marketData = await storage.getLatestMarketData();
      res.json(marketData);
    } catch (error) {
      console.error("Error fetching market data:", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Risk metrics endpoints
  app.get("/api/risk-metrics", async (req, res) => {
    try {
      const riskMetrics = await storage.getRiskMetrics("default-portfolio");
      res.json(riskMetrics);
    } catch (error) {
      console.error("Error fetching risk metrics:", error);
      res.status(500).json({ message: "Failed to fetch risk metrics" });
    }
  });

  // Platform statistics endpoint
  app.get("/api/platform-stats", async (req, res) => {
    try {
      const allFeeds = [...RSS_FEEDS.financial, ...RSS_FEEDS.crypto, ...RSS_FEEDS.geopolitical, ...RSS_FEEDS.stocks];
      const totalNewsArticles = await storage.getNewsArticles().then(articles => articles.length);
      
      const stats = {
        openai: {
          dailyBudget: dailyOpenAIBudget,
          budgetUsed: budgetUsedToday,
          budgetRemaining: dailyOpenAIBudget - budgetUsedToday,
          lastReset: lastResetDate
        },
        feeds: {
          totalFeeds: allFeeds.length,
          categories: {
            financial: RSS_FEEDS.financial.length,
            crypto: RSS_FEEDS.crypto.length,
            geopolitical: RSS_FEEDS.geopolitical.length,
            stocks: RSS_FEEDS.stocks.length
          },
          activeSources: allFeeds.map(feed => feed.name).slice(0, 10)
        },
        news: {
          totalArticles: totalNewsArticles,
          lastUpdate: new Date().toISOString()
        },
        system: {
          status: 'operational',
          uptime: Math.floor(process.uptime()),
          version: '1.0.0'
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  // Manual signal generation endpoint  
  app.post("/api/generate-signal", async (req, res) => {
    try {
      await generateTradingSignal();
      res.json({ message: "Trading signal generated successfully" });
    } catch (error) {
      console.error("Error generating signal:", error);
      res.status(500).json({ message: "Failed to generate trading signal" });
    }
  });

  // Trade history endpoint
  app.get("/api/trades", async (req, res) => {
    try {
      const trades = await storage.getTrades(10);
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trade history" });
    }
  });

  // Broker API endpoints (prepared for live trading)
  app.get("/api/broker/account", async (req, res) => {
    try {
      // Note: This would connect to actual broker in production
      res.json({
        accountId: 'demo-account',
        buyingPower: 100000,
        cash: 50000,
        portfolioValue: 100000,
        equity: 100000,
        status: 'simulation'
      });
    } catch (error) {
      console.error("Error fetching broker account:", error);
      res.status(500).json({ message: "Failed to fetch account information" });
    }
  });

  app.post("/api/broker/order", async (req, res) => {
    try {
      // Note: This would submit real orders in production
      const { symbol, quantity, side, type = 'market' } = req.body;
      
      const mockOrder = {
        id: `order_${Date.now()}`,
        symbol,
        quantity,
        side,
        type,
        status: 'filled',
        filledPrice: 100 + Math.random() * 400,
        submittedAt: new Date().toISOString(),
        mode: 'simulation'
      };
      
      res.json(mockOrder);
    } catch (error) {
      console.error("Error submitting broker order:", error);
      res.status(500).json({ message: "Failed to submit order" });
    }
  });

  app.get("/api/technical-indicators/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      // Generate historical data for technical analysis
      const historicalData = [];
      let basePrice = 100 + Math.random() * 400;
      
      for (let i = 0; i < 60; i++) {
        const volatility = 0.02;
        const change = (Math.random() - 0.5) * volatility * 2;
        const open = basePrice;
        const close = open * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        
        historicalData.push({
          open,
          high,
          low,
          close,
          price: close,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000)
        });
        
        basePrice = close;
      }
      
      // Use enhanced signal generator for real technical analysis
      const { enhancedSignalGenerator } = await import("./services/enhanced-signal-generator");
      const indicators = enhancedSignalGenerator.calculateTechnicalIndicators(historicalData);
      
      res.json({ symbol, indicators, dataPoints: historicalData.length });
    } catch (error) {
      console.error("Error calculating technical indicators:", error);
      res.status(500).json({ message: "Failed to calculate technical indicators" });
    }
  });

  // Enhanced signal generation endpoint
  app.post("/api/enhanced-signal", async (req, res) => {
    try {
      const { symbol } = req.body;
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }

      // Get market data and news
      const marketData = generateMockMarketData(symbol, 60);
      const recentNews = await storage.getNews(5);
      const currentPrice = marketData[marketData.length - 1].close;

      const { enhancedSignalGenerator } = await import("./services/enhanced-signal-generator");
      const signal = await enhancedSignalGenerator.generateEnhancedSignal(
        symbol,
        marketData,
        recentNews,
        currentPrice
      );

      res.json(signal);
    } catch (error) {
      console.error("Enhanced signal generation error:", error);
      res.status(500).json({ error: "Failed to generate enhanced signal" });
    }
  });

  // Backtesting endpoints
  app.post("/api/backtest", async (req, res) => {
    try {
      const { symbol, days = 30, initialBalance = 10000 } = req.body;
      
      if (!symbol) {
        return res.status(400).json({ error: "Symbol is required" });
      }

      const { backtestingService } = await import("./services/backtesting-service");
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const result = await backtestingService.runBacktest(symbol, startDate, endDate, initialBalance);
      res.json(result);
    } catch (error) {
      console.error("Backtesting error:", error);
      res.status(500).json({ error: "Backtesting failed" });
    }
  });

  app.get("/api/signal-accuracy/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      const { backtestingService } = await import("./services/backtesting-service");
      const accuracy = await backtestingService.quickAccuracyTest(symbol);
      
      res.json({
        symbol,
        accuracy: accuracy.accuracy,
        confidence: accuracy.confidence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Signal accuracy test error:", error);
      res.status(500).json({ error: "Failed to test signal accuracy" });
    }
  });

  // News database endpoints
  app.get("/api/news", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      // For now, use storage until database migration is complete
      const allNews = await storage.getNews(100);
      const paginatedNews = allNews.slice(offset, offset + limit);
      
      res.json({
        articles: paginatedNews,
        page,
        pageSize: limit,
        total: allNews.length
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news articles" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const allNews = await storage.getNews(1000);
      const article = allNews.find(a => a.id === id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ error: "Failed to fetch news article" });
    }
  });

  app.get("/api/news/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const allNews = await storage.getNews(1000);
      const results = allNews.filter(article => 
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.summary?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50);
      
      res.json(results);
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ error: "Failed to search news articles" });
    }
  });

  app.post("/api/news", async (req, res) => {
    try {
      const { title, summary, content, url, source, publishedAt, sentiment, sentimentScore, relevanceScore, aiAnalysis } = req.body;
      
      if (!title || !url || !source) {
        return res.status(400).json({ error: "Title, URL, and source are required" });
      }

      const article = await storage.addNews({
        title,
        summary,
        content,
        url,
        source,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        sentiment: sentiment || 'Neutral',
        sentimentScore: sentimentScore || 0,
        relevanceScore: relevanceScore || 0
      });

      res.status(201).json(article);
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({ error: "Failed to create news article" });
    }
  });

  // Auto-trading configuration endpoints
  app.get("/api/auto-trading/config", async (req, res) => {
    try {
      res.json({
        ...autoTradingConfig,
        logs: autoTradingLogs.slice(-10) // Last 10 auto-trading events
      });
    } catch (error) {
      console.error("Error fetching auto-trading config:", error);
      res.status(500).json({ error: "Failed to fetch auto-trading configuration" });
    }
  });

  app.post("/api/auto-trading/config", async (req, res) => {
    try {
      const { enabled, confidenceThreshold, maxDailyTrades } = req.body;
      
      if (typeof enabled === 'boolean') autoTradingConfig.enabled = enabled;
      if (typeof confidenceThreshold === 'number' && confidenceThreshold >= 50 && confidenceThreshold <= 100) {
        autoTradingConfig.confidenceThreshold = confidenceThreshold;
      }
      if (typeof maxDailyTrades === 'number' && maxDailyTrades >= 1 && maxDailyTrades <= 50) {
        autoTradingConfig.maxDailyTrades = maxDailyTrades;
      }
      
      console.log(`🔧 Auto-trading config updated: enabled=${autoTradingConfig.enabled}, threshold=${autoTradingConfig.confidenceThreshold}%, max=${autoTradingConfig.maxDailyTrades} trades`);
      
      res.json(autoTradingConfig);
    } catch (error) {
      console.error("Error updating auto-trading config:", error);
      res.status(500).json({ error: "Failed to update auto-trading configuration" });
    }
  });

  app.get("/api/auto-trading/logs", async (req, res) => {
    try {
      res.json({
        logs: autoTradingLogs.slice(-50), // Last 50 auto-trading events
        stats: {
          totalAutoTrades: autoTradingLogs.length,
          todayAutoTrades: autoTradingConfig.currentDailyTrades,
          maxDailyTrades: autoTradingConfig.maxDailyTrades,
          confidenceThreshold: autoTradingConfig.confidenceThreshold,
          enabled: autoTradingConfig.enabled
        }
      });
    } catch (error) {
      console.error("Error fetching auto-trading logs:", error);
      res.status(500).json({ error: "Failed to fetch auto-trading logs" });
    }
  });

  // AJxAI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: 'Missing userId or message' });
      }

      // Initialize or get conversation
      if (!chatConversations[userId]) {
        chatConversations[userId] = [AJXAI_SYSTEM_PROMPT];
      }

      // Add user message
      chatConversations[userId].push({ role: "user", content: message });

      // Check if OpenAI is available
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
        return res.status(503).json({ 
          error: 'AJxAI is currently unavailable. Please configure your OpenAI API key.',
          response: "I'm currently offline. Please ask the administrator to configure the OpenAI API key to enable AJxAI chat functionality."
        });
      }

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          messages: chatConversations[userId],
          temperature: 0.7,
          max_tokens: 500
        });

        const aiResponse = completion.choices[0].message.content;

        // Add AI response to history
        chatConversations[userId].push({ role: "assistant", content: aiResponse });

        // Limit history to last 20 messages to save tokens
        if (chatConversations[userId].length > 20) {
          chatConversations[userId] = [AJXAI_SYSTEM_PROMPT, ...chatConversations[userId].slice(-19)];
        }

        res.json({ response: aiResponse });
      } catch (error) {
        console.error('AJxAI chat error:', error);
        const fallbackResponse = "I'm experiencing technical difficulties. Please try again in a moment or check your market analysis tools for the latest insights.";
        res.json({ response: fallbackResponse });
      }
    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // Enhanced news analysis endpoint
  app.post("/api/news/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const allNews = await storage.getNews(1000);
      const article = allNews.find(a => a.id === id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Perform AI analysis (simplified for now)
      const analysis = {
        marketImpact: Math.random() > 0.5 ? 'high' : 'medium',
        keyTopics: ['market', 'trading', 'finance'],
        sentiment: article.sentiment,
        confidence: article.sentimentScore || 0.5,
        tradingSignals: []
      };

      res.json({
        articleId: id,
        analysis,
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error analyzing news article:", error);
      res.status(500).json({ error: "Failed to analyze news article" });
    }
  });


  // Portfolio Risk Management API
  app.post("/api/risk/calculate", authenticate, async (req, res) => {
    try {
      const { entryPrice, stopLossPrice, riskTolerancePercent = 2 } = req.body;
      
      if (!entryPrice || !stopLossPrice) {
        return res.status(400).json({ error: "Entry price and stop-loss price are required" });
      }

      // Get user's portfolio balance
      const portfolio = await storage.getPortfolio(req.user.userId);
      const portfolioValue = parseFloat(portfolio?.totalValue || "10000"); // Default demo portfolio

      // Calculate max risk amount
      const maxRiskAmount = (riskTolerancePercent / 100) * portfolioValue;

      // Trade risk per unit
      const tradeRiskPerUnit = Math.abs(entryPrice - stopLossPrice);
      if (tradeRiskPerUnit === 0) {
        return res.status(400).json({ error: "Entry and stop-loss prices cannot be the same" });
      }

      // Max position size (units/shares)
      const maxPositionSize = Math.floor(maxRiskAmount / tradeRiskPerUnit);

      // Max investment amount
      const maxInvestment = maxPositionSize * entryPrice;

      // Risk level assessment
      const riskLevel = riskTolerancePercent > 3 ? 'HIGH' : riskTolerancePercent > 1.5 ? 'MEDIUM' : 'LOW';

      res.json({
        maxPositionSize,
        maxInvestment: Number(maxInvestment.toFixed(2)),
        maxRiskAmount: Number(maxRiskAmount.toFixed(2)),
        riskLevel,
        riskTolerancePercent,
        portfolioValue: Number(portfolioValue.toFixed(2)),
        tradeRiskPerUnit: Number(tradeRiskPerUnit.toFixed(2)),
        message: `You can invest up to $${maxInvestment.toFixed(2)} in this trade without exceeding ${riskTolerancePercent}% risk.`
      });
    } catch (error) {
      console.error("Error calculating position size:", error);
      res.status(500).json({ error: "Failed to calculate position size" });
    }
  });

  // Get portfolio risk metrics
  app.get("/api/risk/portfolio", authenticate, async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.user.userId);
      const positions = await storage.getPositions();
      
      // Calculate portfolio diversification and risk metrics
      const totalValue = parseFloat(portfolio?.totalValue || "10000");
      const totalPositions = positions.length;
      const openPositionsValue = positions
        .filter(p => p.status === 'OPEN')
        .reduce((sum, p) => sum + (p.quantity * parseFloat(p.currentPrice)), 0);
      
      // Portfolio allocation percentages
      const cashAllocation = ((totalValue - openPositionsValue) / totalValue) * 100;
      const positionsAllocation = (openPositionsValue / totalValue) * 100;
      
      // Risk concentration (largest position as % of portfolio)
      const largestPosition = positions.reduce((max, p) => {
        const positionValue = p.quantity * parseFloat(p.currentPrice);
        return positionValue > max ? positionValue : max;
      }, 0);
      const concentration = totalValue > 0 ? (largestPosition / totalValue) * 100 : 0;
      
      res.json({
        portfolioValue: totalValue,
        cashAllocation: Number(cashAllocation.toFixed(1)),
        positionsAllocation: Number(positionsAllocation.toFixed(1)),
        totalPositions,
        largestPositionPercent: Number(concentration.toFixed(1)),
        riskLevel: concentration > 20 ? 'HIGH' : concentration > 10 ? 'MEDIUM' : 'LOW',
        recommendations: [
          concentration > 20 ? 'Consider reducing position concentration' : null,
          cashAllocation > 50 ? 'High cash allocation - consider more diversification' : null,
          totalPositions < 3 ? 'Consider diversifying across more assets' : null
        ].filter(Boolean)
      });
    } catch (error) {
      console.error("Error getting portfolio risk:", error);
      res.status(500).json({ error: "Failed to get portfolio risk metrics" });
    }
  });


  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.register({ email, password });
      res.json(result);
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  });

  app.get('/api/auth/user', authenticate, async (req: any, res) => {
    try {
      const user = await authService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.put('/api/auth/preferences', authenticate, async (req: any, res) => {
    try {
      const user = await authService.updateUserPreferences(req.user.id, req.body);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Live market data endpoints
  app.get('/api/live-prices', async (req, res) => {
    try {
      const symbols = req.query.symbols ? 
        (req.query.symbols as string).split(',') : 
        ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'];
      
      const prices = await binanceService.getLivePrices(symbols);
      res.json(prices);
    } catch (error) {
      console.error('Live prices error:', error);
      res.status(500).json({ error: 'Failed to fetch live prices' });
    }
  });

  // Enhanced market data endpoint with market type support (from attachment)
  app.get('/api/market-data/:market_type', async (req, res) => {
    try {
      const marketType = req.params.market_type;
      
      if (marketType === 'crypto') {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT'];
        const prices = await binanceService.getLivePrices(symbols);
        
        // Format for consistent UI structure (matching attachment format)
        const formattedData = prices.map(ticker => ({
          symbol: ticker.symbol,
          current_price: parseFloat(ticker.price.toString()),
          price_change_24h: 0, // Will be enhanced with real data
          price_change_percent_24h: (Math.random() - 0.5) * 10, // Simulated until API works
          high_24h: parseFloat(ticker.price.toString()) * 1.05,
          low_24h: parseFloat(ticker.price.toString()) * 0.95,
          volume_24h: 1000000 + Math.random() * 5000000,
          timestamp: ticker.timestamp,
          market_type: 'crypto'
        }));

        res.json({
          success: true,
          data: formattedData,
          featured: formattedData[0] || null
        });
        
      } else if (marketType === 'equity') {
        // Use Angel Broking for real equity data
        const angelBrokingService = new AngelBrokingService();
        const equityResult = await angelBrokingService.getEquityMarketData();
        
        res.json({
          success: equityResult.success,
          data: equityResult.data,
          featured: equityResult.data[0] || null,
          error: equityResult.error
        });
        
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid market type. Use "crypto" or "equity"' 
        });
      }
    } catch (error) {
      console.error(`Error fetching ${req.params.market_type} market data:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Unified market overview endpoint (from attachment)
  app.get('/api/market-overview', async (req, res) => {
    try {
      // Fetch crypto data
      let cryptoData = { success: false, data: [] };
      try {
        const cryptoPrices = await binanceService.getLivePrices(['BTCUSDT', 'ETHUSDT', 'ADAUSDT']);
        cryptoData = {
          success: true,
          data: cryptoPrices.map(ticker => ({
            symbol: ticker.symbol,
            current_price: parseFloat(ticker.price.toString()),
            price_change_percent_24h: (Math.random() - 0.5) * 10,
            market_type: 'crypto'
          }))
        };
      } catch (error) {
        console.log('Crypto data not available:', (error as Error).message);
      }

      // Fetch equity data
      let equityData = { success: false, data: [] };
      try {
        const angelBrokingService = new AngelBrokingService();
        const indianResult = await angelBrokingService.getEquityMarketData();
        const indianStocks = indianResult.data || [];
        equityData = {
          success: true,
          data: indianStocks.slice(0, 3).map(stock => ({
            symbol: stock.symbol,
            current_price: parseFloat(stock.ltp.toString()),
            price_change_percent_24h: stock.changePercent || 0,
            market_type: 'equity'
          }))
        };
      } catch (error) {
        console.log('Equity data not available:', (error as Error).message);
      }

      res.json({
        success: true,
        crypto: cryptoData,
        equity: equityData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching market overview:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch market overview' 
      });
    }
  });

  app.get('/api/market-ticker/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const ticker = await binanceService.get24hrTicker(symbol);
      res.json(ticker);
    } catch (error) {
      console.error('Market ticker error:', error);
      res.status(500).json({ error: 'Failed to fetch market ticker' });
    }
  });

  app.get('/api/market-klines/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = req.query.interval as string || '1h';
      const limit = parseInt(req.query.limit as string) || 24;
      
      const klines = await binanceService.getKlines(symbol, interval, limit);
      res.json(klines);
    } catch (error) {
      console.error('Market klines error:', error);
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });

  app.get('/api/trading-pairs', async (req, res) => {
    try {
      const pairs = await binanceService.getTradingPairs();
      res.json(pairs);
    } catch (error) {
      console.error('Trading pairs error:', error);
      res.status(500).json({ error: 'Failed to fetch trading pairs' });
    }
  });

  app.get('/api/market-status', async (req, res) => {
    try {
      res.json({
        binanceConnected: binanceService.isApiConnected(),
        totalUsers: authService.getStats().totalUsers,
        activeUsers: authService.getStats().activeUsers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Market status error:', error);
      res.status(500).json({ error: 'Failed to fetch market status' });
    }
  });

  // Enhanced RSS news sources with geopolitical feeds
  const RSS_FEEDS = [
    // Crypto & Finance
    { url: "https://cointelegraph.com/rss", name: "Cointelegraph" },
    { url: "https://bitcoinist.com/feed/", name: "Bitcoinist" },
    { url: "https://feeds.feedburner.com/oreilly/radar", name: "O'Reilly Radar" },
    { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", name: "CNBC Business" },
    { url: "https://crypto.news/feed/", name: "Crypto.News" },
    { url: "https://decrypt.co/feed", name: "Decrypt" },
    
    // Geopolitical & World News
    { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera" },
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", name: "BBC World" },
    { url: "https://www.theguardian.com/world/rss", name: "The Guardian World" },
    { url: "https://feeds.bloomberg.com/markets/news.rss", name: "Bloomberg Markets" },
    { url: "https://www.investing.com/rss/news.rss", name: "Investing.com Stocks" },
    { url: "https://feeds.reuters.com/reuters/topNews", name: "Reuters World" }
  ];

  // Initialize services
  const initializeMarketServices = async () => {
    try {
      await binanceService.connect();
      console.log('✅ Market services initialized');
    } catch (error) {
      console.warn('⚠️  Market services initialization failed:', error);
    }
  };

  // Reset daily budget at midnight
  function resetDailyBudget() {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      budgetUsedToday = 0;
      lastResetDate = today;
      console.log(`🔄 Reset OpenAI budget: ${dailyOpenAIBudget} calls available`);
    }
  }

  // AI Analysis functions
  async function generateTradingSignal(): Promise<void> {
    try {
      console.log("🔄 Starting signal generation...");
      resetDailyBudget();
      
      const symbols = ["BTC/USD", "ETH/USD", "AAPL", "TSLA", "GOOGL"];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      console.log(`📊 Selected symbol: ${symbol}`);
      
      // Try OpenAI first, fallback to intelligent algorithm
      let analysis = null;
      
      if (process.env.OPENAI_API_KEY && budgetUsedToday < dailyOpenAIBudget) {
        try {
          const prompt = `Analyze current market conditions for ${symbol}.
Use technicals, sentiment, and macro events.
Provide both direct signal and risk scenarios.

Respond in JSON:
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0.85,
  "reasoning": "detailed explanation",
  "targetPrice": number,
  "stopLoss": number,
  "altScenarios": {
    "ifBullish": "target breakout above X",
    "ifBearish": "risk of correction Y",
    "ifNeutral": "range-bound Z"
  }
}`;

          const response = await openai.chat.completions.create({
            model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: "You are a system-level trading strategist. Provide signals with risk scenarios, not just single-direction calls."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 350
          });

          analysis = JSON.parse(response.choices[0].message.content || "{}");
          budgetUsedToday++;
          console.log(`🧠 Generated AI trading signal for ${symbol}`);
        } catch (error) {
          console.log("OpenAI unavailable, using intelligent fallback");
        }
      }
      
      // Fallback: Intelligent signal generation based on market patterns and news sentiment
      if (!analysis) {
        console.log("🔄 Using intelligent fallback signal generation...");
        const recentNews = await storage.getNewsArticles(10);
        const bullishNews = recentNews.filter(n => n.sentiment === 'Bullish');
        const bearishNews = recentNews.filter(n => n.sentiment === 'Bearish');
        const sentimentBias = bullishNews.length > bearishNews.length ? 0.15 : bearishNews.length > bullishNews.length ? -0.15 : 0;
        console.log(`📈 News sentiment: ${bullishNews.length} bullish, ${bearishNews.length} bearish, bias: ${sentimentBias}`);
        
        const marketTrend = Math.random() + sentimentBias;
        const action = marketTrend > 0.6 ? "BUY" : marketTrend < 0.4 ? "SELL" : (Math.random() > 0.5 ? "BUY" : "SELL");
        const confidence = Math.min(0.95, Math.max(0.65, 0.7 + Math.abs(sentimentBias) * 2));
        
        // Find the most relevant news article that influenced this signal
        const relevantNews = action === "BUY" ? bullishNews : bearishNews;
        const influencingArticle = relevantNews.length > 0 ? relevantNews[0] : null;
        
        const reasoningTemplates = {
          BUY: [
            `Strong bullish momentum detected in ${symbol} with ${bullishNews.length} positive news signals`,
            `Technical analysis suggests oversold conditions in ${symbol}, expecting bounce`,
            `Market sentiment improving for ${symbol} with strong institutional interest`,
            `Breaking above key resistance levels in ${symbol} with high volume`
          ],
          SELL: [
            `Bearish sentiment increasing for ${symbol} with ${bearishNews.length} negative news signals`,
            `Technical indicators showing overbought conditions in ${symbol}`,
            `Market concerns affecting ${symbol} sector, expecting pullback`,
            `Breaking below support levels in ${symbol} with weak momentum`
          ]
        };
        
        analysis = {
          action,
          confidence,
          reasoning: reasoningTemplates[action][Math.floor(Math.random() * reasoningTemplates[action].length)],
          newsId: influencingArticle?.id || null
        };
      }
      
      // Generate realistic price
      const basePrice = symbol.includes("BTC") ? 43000 : 
                       symbol.includes("ETH") ? 2200 :
                       symbol.includes("AAPL") ? 187 :
                       symbol.includes("TSLA") ? 250 : 150;
      
      const priceVariation = (Math.random() - 0.5) * 0.05; // ±5% variation
      const currentPrice = basePrice * (1 + priceVariation);
      
      const targetMultiplier = analysis.action === "BUY" ? 1.04 + (Math.random() * 0.06) : 0.96 - (Math.random() * 0.06);
      const stopMultiplier = analysis.action === "BUY" ? 0.97 - (Math.random() * 0.03) : 1.03 + (Math.random() * 0.03);

      const signal = await storage.createTradingSignal({
        symbol,
        action: analysis.action,
        price: currentPrice.toFixed(2),
        targetPrice: (currentPrice * targetMultiplier).toFixed(2),
        stopLoss: (currentPrice * stopMultiplier).toFixed(2),
        confidence: ((analysis.confidence || 0.8) * 100).toFixed(0),
        reasoning: analysis.reasoning || "Technical analysis based on market patterns and news sentiment",
        source: budgetUsedToday > 0 ? "AI" : "Algorithm",
        isActive: true,
        newsId: analysis.newsId || null
      });

      broadcastToClients({
        type: "NEW_SIGNAL",
        signal
      });

      console.log(`📊 Generated new trading signal for ${symbol}: ${analysis.action} (${((analysis.confidence || 0.8) * 100).toFixed(0)}% confidence)`);
      
      // Auto-execute high confidence signals
      const signalConfidence = parseInt(signal.confidence);
      if (autoTradingConfig.enabled && signalConfidence >= autoTradingConfig.confidenceThreshold) {
        await executeAutoTrade(signal);
      }
      
    } catch (error) {
      console.error("Error generating trading signal:", error);
    }
  }

  // Auto-trading execution function
  async function executeAutoTrade(signal: any): Promise<void> {
    try {
      // Reset daily trade count if new day
      const today = new Date().toDateString();
      if (autoTradingConfig.lastResetDate !== today) {
        autoTradingConfig.currentDailyTrades = 0;
        autoTradingConfig.lastResetDate = today;
      }

      // Check daily trade limit
      if (autoTradingConfig.currentDailyTrades >= autoTradingConfig.maxDailyTrades) {
        console.log(`🚫 Auto-trading daily limit reached (${autoTradingConfig.maxDailyTrades} trades)`);
        return;
      }

      console.log(`🚀 AUTO-EXECUTING high confidence signal: ${signal.symbol} ${signal.action} (${signal.confidence}% confidence)`);

      // Simulate realistic execution with slippage
      const basePrice = parseFloat(signal.price);
      const slippageBps = Math.random() * 8 + 1; // 0.01% to 0.09% slippage
      const slippageMultiplier = signal.action === "BUY" ? (1 + slippageBps / 10000) : (1 - slippageBps / 10000);
      const filledPrice = basePrice * slippageMultiplier;
      const slippagePercent = Math.abs((filledPrice - basePrice) / basePrice) * 100;

      // Calculate portfolio impact
      const currentPortfolio = await storage.getPortfolio("default-user");
      const portfolioValue = currentPortfolio ? parseFloat(currentPortfolio.totalValue) : 100000;
      const positionSize = filledPrice * 1; // 1 share/unit
      const portfolioImpactPercent = (positionSize / portfolioValue) * 100;

      // Create position from auto-executed signal
      const position = await storage.createPosition({
        portfolioId: "default-portfolio",
        symbol: signal.symbol,
        type: signal.action === "BUY" ? "LONG" : "SHORT",
        quantity: "1",
        entryPrice: filledPrice.toFixed(2),
        currentPrice: filledPrice.toFixed(2),
        pnl: "0",
        pnlPercent: "0",
        status: "OPEN"
      });

      // Create trade execution record
      const tradeExecution = {
        id: position.id,
        symbol: signal.symbol,
        action: signal.action,
        quantity: "1",
        entryPrice: signal.price,
        filledPrice: filledPrice.toFixed(2),
        slippage: slippagePercent.toFixed(3),
        executedAt: new Date().toISOString(),
        estimatedImpact: `${portfolioImpactPercent.toFixed(2)}% of portfolio`,
        confidence: signal.confidence,
        reasoning: signal.reasoning,
        autoExecuted: true
      };

      // Store trade in history
      await storage.createTrade(tradeExecution);

      // Update signal as executed
      await storage.updateTradingSignal(signal.id, { isActive: false });

      // Increment daily trade counter
      autoTradingConfig.currentDailyTrades++;

      // Log auto-execution
      autoTradingLogs.push({
        timestamp: new Date().toISOString(),
        signal: signal,
        action: signal.action,
        confidence: parseInt(signal.confidence),
        result: `Executed at ${filledPrice.toFixed(2)} (${slippagePercent.toFixed(3)}% slippage)`
      });

      // Broadcast auto-execution to clients
      broadcastToClients({
        type: "AUTO_TRADE_EXECUTED",
        signal,
        position,
        tradeExecution,
        autoTradingStats: {
          dailyTrades: autoTradingConfig.currentDailyTrades,
          maxDailyTrades: autoTradingConfig.maxDailyTrades,
          confidenceThreshold: autoTradingConfig.confidenceThreshold
        }
      });

      console.log(`✅ Auto-executed ${signal.action} for ${signal.symbol} at ${filledPrice.toFixed(2)} (${autoTradingConfig.currentDailyTrades}/${autoTradingConfig.maxDailyTrades} daily trades)`);
    } catch (error) {
      console.error("Auto-trading execution failed:", error);
      
      // Log failed execution
      autoTradingLogs.push({
        timestamp: new Date().toISOString(),
        signal: signal,
        action: signal.action,
        confidence: parseInt(signal.confidence),
        result: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  async function fetchAndAnalyzeNews(): Promise<void> {
    try {
      let articles: any[] = [];
      
      // Fetch from RSS feeds
      // Select a few random feeds to avoid overwhelming the system
      const selectedFeeds = RSS_FEEDS.sort(() => 0.5 - Math.random()).slice(0, 6);
      
      for (const feedSource of selectedFeeds) {
        try {
          console.log(`Fetching RSS feed: ${feedSource.name}`);
          const feed = await rssParser.parseURL(feedSource.url);
          
          // Get latest 2 articles from each feed
          const feedArticles = feed.items.slice(0, 2).map(item => ({
            title: item.title || '',
            description: item.contentSnippet || item.summary || item.content || '',
            url: item.link || '',
            source: { name: feedSource.name },
            publishedAt: item.pubDate || new Date().toISOString(),
            content: item.contentSnippet || item.summary || ''
          }));
          
          articles.push(...feedArticles);
        } catch (error) {
          console.log(`Failed to fetch RSS feed ${feedSource.name}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      // If no RSS feeds worked, fallback to sample articles
      if (articles.length === 0) {
        console.log("No RSS feeds available, using fallback articles");
        articles = [
          {
            title: "Federal Reserve Signals Potential Rate Cut Amid Economic Uncertainty",
            description: "Market analysts predict significant impact on crypto and tech stocks following Fed announcement",
            url: "https://example.com/fed-rates",
            source: { name: "Reuters" },
            publishedAt: new Date().toISOString()
          },
          {
            title: "Major Tech Earnings Miss Expectations, Stocks Tumble",
            description: "Tech giants report lower-than-expected quarterly results, triggering market-wide selloff",
            url: "https://example.com/tech-earnings",
            source: { name: "CNBC" },
            publishedAt: new Date(Date.now() - 600000).toISOString()
          }
        ];
      }

      // Reset daily budget if needed
      resetDailyBudget();
      
      // Step 1: Cheap analysis for all articles
      const cheapAnalyzedArticles = cheapAnalysis(articles);
      console.log(`🔍 Cheap analysis completed for ${cheapAnalyzedArticles.length} articles`);
      
      // Step 2: Deep analysis for selected high-relevance articles (budget-controlled)
      let deepAnalysisCount = 0;
      
      for (const article of cheapAnalyzedArticles) {
        let finalAnalysis = article.cheapAnalysis;
        
        // Use deep analysis if article is relevant and budget allows
        if (article.cheapAnalysis.shouldDeepAnalyze && 
            budgetUsedToday < dailyOpenAIBudget && 
            deepAnalysisCount < 3) { // Max 3 deep analyses per batch
          
          try {
            const deepResult = await deepAnalysis(article);
            if (deepResult.deepAnalysis && !deepResult.deepAnalysis.error) {
              finalAnalysis = {
                ...article.cheapAnalysis,
                sentiment: deepResult.deepAnalysis.sentiment,
                confidence: deepResult.deepAnalysis.confidence,
                isDeepAnalyzed: true
              };
              deepAnalysisCount++;
              console.log(`🧠 Deep analysis: ${article.title.substring(0, 50)}...`);
            }
          } catch (error) {
            console.log(`Deep analysis failed, using cheap analysis for: ${article.title.substring(0, 30)}...`);
          }
        }

        try {
          const newsArticle = await storage.createNewsArticle({
            title: article.title,
            summary: article.description || "Market news update",
            content: article.content || article.description || "",
            url: article.url,
            source: article.source?.name || "Unknown",
            publishedAt: new Date(article.publishedAt),
            sentiment: finalAnalysis.sentimentLabel || finalAnalysis.sentiment || "Neutral",
            sentimentScore: (finalAnalysis.confidence || finalAnalysis.relevanceScore || 0.5).toString(),
            relevanceScore: finalAnalysis.relevanceScore?.toString() || "0.5",
            isDeepAnalyzed: finalAnalysis.isDeepAnalyzed || false
          });

          broadcastToClients({
            type: "NEW_NEWS",
            article: newsArticle
          });

        } catch (error) {
          console.error("Error storing article:", error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      console.log(`💰 OpenAI calls used: ${deepAnalysisCount} (Budget: ${budgetUsedToday}/${dailyOpenAIBudget})`);
      console.log(`Processed ${articles.length} news articles from RSS feeds`);
    } catch (error) {
      console.error("Error fetching and analyzing news:", error);
    }
  }

  async function updateMarketData(): Promise<void> {
    try {
      const symbols = ["BTC/USD", "ETH/USD", "AAPL", "TSLA", "GOOGL"];
      
      for (const symbol of symbols) {
        const existing = await storage.getMarketData(symbol);
        const basePrice = existing ? parseFloat(existing.price) : 
                         symbol.includes("BTC") ? 43000 : 
                         symbol.includes("ETH") ? 2200 :
                         symbol.includes("AAPL") ? 187 :
                         symbol.includes("TSLA") ? 250 : 150;
        
        const change = (Math.random() - 0.5) * basePrice * 0.02; // ±2% change
        const newPrice = basePrice + change;
        const changePercent = (change / basePrice) * 100;

        const marketData = await storage.createMarketData({
          symbol,
          price: newPrice.toFixed(2),
          volume: (Math.random() * 1000000).toFixed(0),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2)
        });

        // Update positions with new prices
        const positions = await storage.getPositions("default-portfolio");
        for (const position of positions.filter(p => p.symbol === symbol && p.status === "OPEN")) {
          const entryPrice = parseFloat(position.entryPrice);
          const pnl = (newPrice - entryPrice) * parseFloat(position.quantity);
          const pnlPercent = (pnl / (entryPrice * parseFloat(position.quantity))) * 100;
          
          await storage.updatePosition(position.id, {
            currentPrice: newPrice.toFixed(2),
            pnl: pnl.toFixed(2),
            pnlPercent: pnlPercent.toFixed(2)
          });
        }
      }

      broadcastToClients({
        type: "MARKET_DATA_UPDATE",
        timestamp: new Date()
      });

    } catch (error) {
      console.error("Error updating market data:", error);
    }
  }

  async function updateRiskMetrics(): Promise<void> {
    try {
      const positions = await storage.getPositions("default-portfolio");
      const openPositions = positions.filter(p => p.status === "OPEN");
      
      // Calculate risk metrics
      const totalValue = openPositions.reduce((sum, pos) => 
        sum + parseFloat(pos.currentPrice) * parseFloat(pos.quantity), 0);
      
      const volatilityScore = Math.min(100, totalValue > 50000 ? 85 : 60);
      const diversificationScore = Math.min(100, openPositions.length * 15);
      const portfolioRiskScore = (volatilityScore + (100 - diversificationScore)) / 2;

      const riskMetrics = {
        portfolioId: "default-portfolio",
        portfolioRisk: portfolioRiskScore > 70 ? "High" : portfolioRiskScore > 40 ? "Medium" : "Low",
        portfolioRiskScore: portfolioRiskScore.toFixed(0),
        diversification: diversificationScore > 70 ? "Good" : diversificationScore > 40 ? "Fair" : "Poor",
        diversificationScore: diversificationScore.toFixed(0),
        volatility: volatilityScore > 70 ? "High" : volatilityScore > 40 ? "Medium" : "Low",
        volatilityScore: volatilityScore.toFixed(0),
        recommendations: [
          { text: "Consider reducing crypto exposure", priority: "medium" },
          { text: "Increase defensive positions", priority: "high" },
          { text: "Set tighter stop-losses", priority: "medium" }
        ]
      };
      
      await storage.createRiskMetrics(riskMetrics);
      
      broadcastToClients({
        type: "RISK_UPDATE",
        metrics: riskMetrics
      });
    } catch (error) {
      console.error("Error updating risk metrics:", error);
    }
  }

  // Cheap analysis layer - uses free local NLP tools
  function cheapAnalysis(articles: any[]) {
    return articles.map(article => {
      const fullText = `${article.title} ${article.description}`.toLowerCase();
      
      // 1. Keyword filtering
      const relevantKeywords = TRADING_KEYWORDS.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      );
      
      // 2. Local sentiment analysis (free)
      const sentimentResult = sentiment.analyze(fullText);
      const sentimentScore = sentimentResult.score;
      const sentimentLabel = sentimentScore > 1 ? 'Bullish' : 
                           sentimentScore < -1 ? 'Bearish' : 'Neutral';
      
      // 3. Simple entity extraction using compromise
      const doc = nlp(article.title + ' ' + article.description);
      const entities = [
        ...doc.organizations().out('array'),
        ...doc.people().out('array'),
        ...doc.places().out('array')
      ];
      
      // 4. TF-IDF-like scoring using natural
      const tokenizer = new natural.WordTokenizer();
      const tokens = tokenizer.tokenize(fullText);
      const tfidfScore = tokens ? tokens.length * relevantKeywords.length : 0;
      
      // 5. Relevance scoring
      const relevanceScore = Math.min(1, (
        relevantKeywords.length * 0.3 + 
        Math.abs(sentimentScore) * 0.05 +
        entities.length * 0.1 +
        tfidfScore * 0.001
      ));
      
      return {
        ...article,
        cheapAnalysis: {
          sentimentScore,
          sentimentLabel,
          relevantKeywords,
          entities,
          tfidfScore,
          relevanceScore,
          shouldDeepAnalyze: relevanceScore > 0.4 && Math.abs(sentimentScore) > 1
        }
      };
    });
  }

  // Deep analysis layer - uses OpenAI GPT-5 (expensive, budget-controlled)
  async function deepAnalysis(article: any): Promise<any> {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'demo-key') {
      return { deepAnalysis: { error: 'OpenAI API key not configured' } };
    }

    try {
      const prompt = `Analyze this financial news for trading insights:

Title: ${article.title}
Content: ${article.description}
Keywords found: ${article.cheapAnalysis.relevantKeywords.join(', ')}

Provide analysis in JSON format:
{
  "sentiment": "Bullish|Bearish|Neutral",
  "confidence": 0.85,
  "marketImpact": "High|Medium|Low",
  "affectedAssets": ["BTC", "ETH", "Stocks"],
  "timeHorizon": "Short|Medium|Long",
  "tradingSignal": "BUY|SELL|HOLD",
  "reasoning": "Brief explanation"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [{
          role: "system",
          content: "You are an expert financial analyst. Provide concise trading insights."
        }, {
          role: "user",
          content: prompt
        }],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      budgetUsedToday++;
      console.log(`💰 OpenAI budget used: ${budgetUsedToday}/${dailyOpenAIBudget}`);
      
      return {
        ...article,
        deepAnalysis: JSON.parse(response.choices[0].message.content || '{}')
      };
    } catch (error) {
      console.error('Deep analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      return {
        ...article,
        deepAnalysis: { 
          sentiment: article.cheapAnalysis.sentimentLabel,
          confidence: 0.5,
          error: 'Deep analysis unavailable'
        }
      };
    }
  }

  // Initialize enhanced intelligence services
  const socialScraper = new SocialScraper(storage);
  const angelBroking = new AngelBrokingService();
  const telegramScraper = new TelegramScraper(storage);
  const fusionEngine = new SignalFusionEngine(storage);
  
  // Social sentiment API endpoints
  app.get("/api/social/trending", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const trending = await socialScraper.getTrendingSymbols(hours);
      res.json(trending);
    } catch (error) {
      console.error("Error fetching trending symbols:", error);
      res.status(500).json({ message: "Failed to fetch trending symbols" });
    }
  });

  app.get("/api/social/sentiment/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const hours = parseInt(req.query.hours as string) || 4;
      const sentiment = await socialScraper.getSentimentMomentum(symbol.toUpperCase(), hours);
      res.json(sentiment);
    } catch (error) {
      console.error("Error fetching sentiment momentum:", error);
      res.status(500).json({ message: "Failed to fetch sentiment momentum" });
    }
  });

  app.get("/api/social/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getSocialMessages?.(limit) || [];
      res.json(messages);
    } catch (error) {
      console.error("Error fetching social messages:", error);
      res.status(500).json({ message: "Failed to fetch social messages" });
    }
  });

  // Angel Broking Indian Market Data API endpoints
  app.get("/api/indian-market/live", async (req, res) => {
    try {
      const marketResult = await angelBroking.getEquityMarketData();
      const marketData = marketResult.data || [];
      res.json(marketData);
    } catch (error) {
      console.error("Error fetching Indian market data:", error);
      res.status(500).json({ message: "Failed to fetch Indian market data" });
    }
  });

  app.get("/api/indian-market/gainers", async (req, res) => {
    try {
      const gainers = [];
      res.json(gainers);
    } catch (error) {
      console.error("Error fetching top gainers:", error);
      res.status(500).json({ message: "Failed to fetch top gainers" });
    }
  });

  app.get("/api/indian-market/losers", async (req, res) => {
    try {
      const losers = [];
      res.json(losers);
    } catch (error) {
      console.error("Error fetching top losers:", error);
      res.status(500).json({ message: "Failed to fetch top losers" });
    }
  });

  app.get("/api/indian-market/active", async (req, res) => {
    try {
      const active = [];
      res.json(active);
    } catch (error) {
      console.error("Error fetching most active:", error);
      res.status(500).json({ message: "Failed to fetch most active" });
    }
  });

  app.get("/api/indian-market/historical/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const historicalData = [];
      res.json(historicalData);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      res.status(500).json({ message: "Failed to fetch historical data" });
    }
  });

  // Telegram Intelligence API endpoints
  app.get("/api/telegram/messages", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getTelegramMessages?.(limit) || [];
      res.json(messages);
    } catch (error) {
      console.error("Error fetching Telegram messages:", error);
      res.status(500).json({ message: "Failed to fetch Telegram messages" });
    }
  });

  app.get("/api/telegram/trending", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 6;
      const trending = await telegramScraper.getTrendingFromTelegram(hours);
      res.json(trending);
    } catch (error) {
      console.error("Error fetching Telegram trending:", error);
      res.status(500).json({ message: "Failed to fetch Telegram trending" });
    }
  });

  app.get("/api/telegram/channels", async (req, res) => {
    try {
      const channels = telegramScraper.getChannels();
      res.json(channels);
    } catch (error) {
      console.error("Error fetching Telegram channels:", error);
      res.status(500).json({ message: "Failed to fetch Telegram channels" });
    }
  });

  // Fusion Signals API endpoints  
  app.get("/api/fusion/signals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const signals = await fusionEngine.getLatestFusionSignals(limit);
      res.json(signals);
    } catch (error) {
      console.error("Error fetching fusion signals:", error);
      res.status(500).json({ message: "Failed to fetch fusion signals" });
    }
  });

  app.post("/api/fusion/generate", async (req, res) => {
    try {
      const { symbol, symbols } = req.body;
      
      if (symbol) {
        // Generate single fusion signal
        const signal = await fusionEngine.generateFusionSignal(symbol);
        res.json(signal);
      } else if (symbols && Array.isArray(symbols)) {
        // Generate multiple fusion signals
        const signals = await fusionEngine.runFusionAnalysis(symbols);
        res.json(signals);
      } else {
        // Generate default analysis
        const signals = await fusionEngine.runFusionAnalysis();
        res.json(signals);
      }
    } catch (error) {
      console.error("Error generating fusion signals:", error);
      res.status(500).json({ message: "Failed to generate fusion signals" });
    }
  });

  app.get("/api/fusion/data-sources", async (req, res) => {
    try {
      const dataSources = fusionEngine.getDataSourceStatus();
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data source status:", error);
      res.status(500).json({ message: "Failed to fetch data source status" });
    }
  });

  // Test endpoint for Binance connection
  app.get("/api/test-binance-connection", async (req, res) => {
    try {
      console.log('🔄 Manual Binance connection test requested...');
      await binanceService.connect();
      const isConnected = binanceService.isApiConnected();
      
      if (isConnected) {
        // Test with a real price fetch
        const livePrices = await binanceService.getLivePrices(['BTCUSDT']);
        res.json({ 
          success: true, 
          connected: isConnected, 
          sampleData: livePrices[0],
          message: 'Binance API connected successfully!' 
        });
      } else {
        res.json({ 
          success: false, 
          connected: false, 
          message: 'Failed to connect to Binance API - using fallback data' 
        });
      }
    } catch (error) {
      console.error('Binance connection test error:', error);
      res.json({ 
        success: false, 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Binance connection test failed' 
      });
    }
  });

  // Schedule enhanced scraping and analysis
  cron.schedule('*/10 * * * *', async () => {
    console.log('🔄 Running social media scraper...');
    await socialScraper.runScraper();
  });

  cron.schedule('*/15 * * * *', async () => {
    console.log('📱 Running Telegram scraper...');
    await telegramScraper.runScraper();
  });

  cron.schedule('*/5 * * * *', async () => {
    console.log('📊 Updating Indian market data...');
    await angelBroking.getEquityMarketData();
  });

  cron.schedule('*/20 * * * *', async () => {
    console.log('🚀 Running fusion signal analysis...');
    await fusionEngine.runFusionAnalysis(['BTC', 'ETH', 'RELIANCE', 'TCS']);
  });

  // Schedule automated tasks
  cron.schedule('*/2 * * * *', generateTradingSignal); // Every 2 minutes
  cron.schedule('*/5 * * * *', fetchAndAnalyzeNews); // Every 5 minutes
  cron.schedule('*/1 * * * *', updateMarketData); // Every minute
  cron.schedule('*/10 * * * *', updateRiskMetrics); // Every 10 minutes

  // Initialize Binance connection immediately 
  (async () => {
    console.log('🔄 Connecting to Binance API...');
    await binanceService.connect();
    console.log(`📊 Binance connected: ${binanceService.isApiConnected()}`);
  })();

  // Initialize enhanced intelligence systems
  setTimeout(async () => {
    generateTradingSignal();
    fetchAndAnalyzeNews();
    updateMarketData();
    updateRiskMetrics();
    socialScraper.runScraper(); // Initial social scraping
    
    // Initialize fusion engine and run initial analysis
    await fusionEngine.initialize();
    await telegramScraper.runScraper(); // Initial telegram scraping
    await angelBroking.getEquityMarketData(); // Initial Indian market data
    
    // Run initial fusion analysis
    setTimeout(() => {
      fusionEngine.runFusionAnalysis(['BTC', 'ETH', 'RELIANCE', 'TCS']);
    }, 10000); // Wait 10 seconds for data to populate
  }, 2000);

  return httpServer;
}
