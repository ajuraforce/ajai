import { MemStorage } from '../storage';
import AngelBrokingService from './angel-broking';
import { TelegramScraper } from './telegram-scraper';
import { SocialScraper } from './social-scraper';
import { randomUUID } from 'crypto';

interface FusionSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  finalScore: number;
  reasoning: string;
  timestamp: Date;
  
  // Data source scores
  technicalScore: number;
  socialScore: number;
  telegramScore: number;
  indianMarketScore?: number;
  newsScore: number;
  
  // Supporting data
  socialMentions: number;
  telegramMentions: number;
  sentimentMomentum: number;
  volumeIndicator: number;
  
  // Risk assessment
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  
  // Execution guidance
  suggestedEntry?: number;
  suggestedStopLoss?: number;
  suggestedTarget?: number;
  positionSize?: number;
  
  // Metadata
  dataSourcesUsed: string[];
  lastUpdated: Date;
  isActive: boolean;
}

interface DataSource {
  name: string;
  weight: number;
  isAvailable: boolean;
  lastUpdate?: Date;
}

export class SignalFusionEngine {
  private storage: MemStorage;
  private angelBroking: AngelBrokingService;
  private telegramScraper: TelegramScraper;
  private socialScraper: SocialScraper;
  
  // Data source weights (can be adjusted based on performance)
  private dataSourceWeights = {
    technical: 0.30,     // Traditional technical analysis
    social: 0.25,        // Reddit/RSS social sentiment
    telegram: 0.25,      // Telegram channel signals
    indianMarket: 0.10,  // Angel Broking Indian market data
    news: 0.10          // News sentiment analysis
  };

  // Symbol categories for different treatment
  private cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'MATIC', 'DOT', 'LINK', 'UNI', 'AVAX', 'ATOM'];
  private indianStocks = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'KOTAKBANK', 'SBIN'];
  private forexPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD'];

  constructor(storage: MemStorage) {
    this.storage = storage;
    this.angelBroking = new AngelBrokingService();
    this.telegramScraper = new TelegramScraper(storage);
    this.socialScraper = new SocialScraper(storage);
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing Signal Fusion Engine...');
    
    // Initialize all data sources
    await Promise.all([
      this.telegramScraper.initialize(),
      // Angel service and social scraper are ready automatically
    ]);
    
    console.log('✅ Signal Fusion Engine ready');
  }

  async generateFusionSignal(symbol: string): Promise<FusionSignal> {
    const timestamp = new Date();
    const id = randomUUID();
    
    console.log(`🔄 Generating fusion signal for ${symbol}...`);

    // Gather data from all sources
    const [
      technicalData,
      socialData,
      telegramData,
      indianMarketData,
      newsData
    ] = await Promise.allSettled([
      this.getTechnicalScore(symbol),
      this.getSocialScore(symbol),
      this.getTelegramScore(symbol),
      this.getIndianMarketScore(symbol),
      this.getNewsScore(symbol)
    ]);

    // Extract scores (default to neutral if failed)
    const technicalScore = technicalData.status === 'fulfilled' ? technicalData.value : 0;
    const socialScore = socialData.status === 'fulfilled' ? socialData.value.score : 0;
    const telegramScore = telegramData.status === 'fulfilled' ? telegramData.value.score : 0;
    const indianMarketScore = indianMarketData.status === 'fulfilled' ? indianMarketData.value : 0;
    const newsScore = newsData.status === 'fulfilled' ? newsData.value : 0;

    // Get additional metadata
    const socialMentions = socialData.status === 'fulfilled' ? socialData.value.mentions : 0;
    const telegramMentions = telegramData.status === 'fulfilled' ? telegramData.value.mentions : 0;
    const sentimentMomentum = this.calculateSentimentMomentum(socialScore, telegramScore);

    // Calculate weighted final score
    const finalScore = this.calculateWeightedScore({
      technicalScore,
      socialScore,
      telegramScore,
      indianMarketScore,
      newsScore
    }, symbol);

    // Determine direction and confidence
    const { direction, confidence } = this.determineDirectionAndConfidence(finalScore);

    // Assess market conditions
    const { riskLevel, timeHorizon, marketCondition } = this.assessMarketConditions(symbol, {
      technicalScore,
      socialScore,
      telegramScore,
      socialMentions,
      telegramMentions
    });

    // Generate trading parameters
    const tradingParams = await this.generateTradingParameters(symbol, direction, confidence);

    // Create reasoning explanation
    const reasoning = this.generateReasoning(symbol, {
      technicalScore,
      socialScore,
      telegramScore,
      indianMarketScore,
      newsScore,
      socialMentions,
      telegramMentions,
      finalScore,
      direction
    });

    const fusionSignal: FusionSignal = {
      id,
      symbol,
      direction,
      confidence,
      finalScore,
      reasoning,
      timestamp,
      
      // Scores
      technicalScore,
      socialScore,
      telegramScore,
      indianMarketScore,
      newsScore,
      
      // Supporting data
      socialMentions,
      telegramMentions,
      sentimentMomentum,
      volumeIndicator: this.calculateVolumeIndicator(socialMentions, telegramMentions),
      
      // Risk assessment
      riskLevel,
      timeHorizon,
      marketCondition,
      
      // Trading parameters
      ...tradingParams,
      
      // Metadata
      dataSourcesUsed: this.getUsedDataSources({
        technicalData: technicalData.status === 'fulfilled',
        socialData: socialData.status === 'fulfilled',
        telegramData: telegramData.status === 'fulfilled',
        indianMarketData: indianMarketData.status === 'fulfilled',
        newsData: newsData.status === 'fulfilled'
      }),
      lastUpdated: timestamp,
      isActive: true
    };

    // Save to storage
    if (this.storage.saveFusionSignal) {
      await this.storage.saveFusionSignal(fusionSignal);
    }

    console.log(`✅ Fusion signal generated: ${symbol} ${direction} (${Math.round(confidence)}%)`);
    
    return fusionSignal;
  }

  private async getTechnicalScore(symbol: string): Promise<number> {
    // Use existing enhanced signal generator for technical analysis
    try {
      const marketData = this.generateMockMarketData(symbol, 50);
      const { enhancedSignalGenerator } = await import('./enhanced-signal-generator');
      const indicators = enhancedSignalGenerator.calculateTechnicalIndicators(marketData);
      
      // Convert technical indicators to a score (-1 to 1)
      const rsi = indicators.rsi || 50;
      const macdSignal = indicators.macdSignal || 0;
      const volumeProfile = indicators.volumeProfile || 0;
      
      // Combine indicators into a single score
      const rsiScore = (50 - rsi) / 50; // Invert RSI (oversold = positive)
      const technicalScore = (rsiScore + macdSignal + volumeProfile) / 3;
      
      return Math.max(-1, Math.min(1, technicalScore));
    } catch (error) {
      console.log(`Technical analysis failed for ${symbol}:`, error);
      return 0;
    }
  }

  private async getSocialScore(symbol: string): Promise<{ score: number; mentions: number }> {
    try {
      const trending = await this.socialScraper.getTrendingSymbols(6);
      const symbolData = trending.find(t => t.symbol === symbol);
      
      if (!symbolData) {
        return { score: 0, mentions: 0 };
      }
      
      return {
        score: Math.max(-1, Math.min(1, symbolData.avgSentiment)),
        mentions: symbolData.mentionCount
      };
    } catch (error) {
      return { score: 0, mentions: 0 };
    }
  }

  private async getTelegramScore(symbol: string): Promise<{ score: number; mentions: number }> {
    try {
      const trending = await this.telegramScraper.getTrendingFromTelegram(6);
      const symbolData = trending.find(t => t.symbol === symbol);
      
      if (!symbolData) {
        return { score: 0, mentions: 0 };
      }
      
      return {
        score: Math.max(-1, Math.min(1, symbolData.avgSentiment)),
        mentions: symbolData.mentions
      };
    } catch (error) {
      return { score: 0, mentions: 0 };
    }
  }

  private async getIndianMarketScore(symbol: string): Promise<number> {
    if (!this.indianStocks.some(stock => symbol.includes(stock))) {
      return 0; // Not an Indian stock
    }
    
    try {
      const marketResult = await this.angelBroking.getEquityMarketData();
      const marketData = marketResult.data || [];
      const stockData = marketData.find(stock => stock.symbol.includes(symbol) || symbol.includes(stock.symbol));
      
      if (!stockData) return 0;
      
      // Convert price change percentage to score
      const changePercent = stockData.changePercent;
      const normalizedScore = Math.tanh(changePercent / 5); // Normalize to -1 to 1
      
      return Math.max(-1, Math.min(1, normalizedScore));
    } catch (error) {
      return 0;
    }
  }

  private async getNewsScore(symbol: string): Promise<number> {
    try {
      const news = await this.storage.getNewsArticles(50);
      const relevantNews = news.filter(article => 
        article.title?.toUpperCase().includes(symbol) || 
        article.description?.toUpperCase().includes(symbol)
      );
      
      if (relevantNews.length === 0) return 0;
      
      // Calculate average sentiment from news
      const avgSentiment = relevantNews.reduce((sum, article) => {
        return sum + (article.sentiment === 'Bullish' ? 0.5 : article.sentiment === 'Bearish' ? -0.5 : 0);
      }, 0) / relevantNews.length;
      
      return Math.max(-1, Math.min(1, avgSentiment));
    } catch (error) {
      return 0;
    }
  }

  private calculateWeightedScore(scores: {
    technicalScore: number;
    socialScore: number;
    telegramScore: number;
    indianMarketScore: number;
    newsScore: number;
  }, symbol: string): number {
    // Adjust weights based on symbol type
    let weights = { ...this.dataSourceWeights };
    
    if (this.cryptoSymbols.includes(symbol)) {
      // For crypto, give more weight to social and telegram
      weights.social = 0.30;
      weights.telegram = 0.30;
      weights.technical = 0.25;
      weights.indianMarket = 0.05;
      weights.news = 0.10;
    } else if (this.indianStocks.some(stock => symbol.includes(stock))) {
      // For Indian stocks, give more weight to Angel Broking data
      weights.indianMarket = 0.35;
      weights.technical = 0.35;
      weights.social = 0.15;
      weights.telegram = 0.10;
      weights.news = 0.05;
    }

    const weightedScore = 
      scores.technicalScore * weights.technical +
      scores.socialScore * weights.social +
      scores.telegramScore * weights.telegram +
      scores.indianMarketScore * weights.indianMarket +
      scores.newsScore * weights.news;

    return Math.max(-1, Math.min(1, weightedScore));
  }

  private determineDirectionAndConfidence(finalScore: number): { direction: 'BUY' | 'SELL' | 'HOLD'; confidence: number } {
    const absScore = Math.abs(finalScore);
    const confidence = Math.min(100, Math.max(50, absScore * 100));
    
    if (finalScore > 0.15) {
      return { direction: 'BUY', confidence };
    } else if (finalScore < -0.15) {
      return { direction: 'SELL', confidence };
    } else {
      return { direction: 'HOLD', confidence: Math.min(confidence, 60) };
    }
  }

  private assessMarketConditions(symbol: string, data: any): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
    marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  } {
    // Assess risk based on mentions and sentiment consistency
    const totalMentions = data.socialMentions + data.telegramMentions;
    const sentimentConsistency = Math.abs(data.socialScore - data.telegramScore);
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (totalMentions > 50 && sentimentConsistency < 0.3) {
      riskLevel = 'LOW'; // High confidence with consistent sentiment
    } else if (totalMentions < 10 || sentimentConsistency > 0.7) {
      riskLevel = 'HIGH'; // Low volume or conflicting signals
    }

    // Determine time horizon based on signal strength
    const signalStrength = Math.abs(data.technicalScore) + Math.abs(data.socialScore) + Math.abs(data.telegramScore);
    let timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG' = 'MEDIUM';
    
    if (signalStrength > 1.5) {
      timeHorizon = 'SHORT'; // Strong signals for quick moves
    } else if (signalStrength < 0.5) {
      timeHorizon = 'LONG'; // Weak signals require patience
    }

    // Assess overall market condition
    const avgSentiment = (data.socialScore + data.telegramScore + data.technicalScore) / 3;
    let marketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    
    if (avgSentiment > 0.2) {
      marketCondition = 'BULLISH';
    } else if (avgSentiment < -0.2) {
      marketCondition = 'BEARISH';
    }

    return { riskLevel, timeHorizon, marketCondition };
  }

  private async generateTradingParameters(symbol: string, direction: string, confidence: number): Promise<{
    suggestedEntry?: number;
    suggestedStopLoss?: number;
    suggestedTarget?: number;
    positionSize?: number;
  }> {
    try {
      // Get current price (mock for demo)
      const currentPrice = this.getMockCurrentPrice(symbol);
      
      if (!currentPrice) return {};
      
      const volatilityFactor = 0.05; // 5% volatility assumption
      const riskReward = 2; // 1:2 risk-reward ratio
      
      let entry, stopLoss, target;
      
      if (direction === 'BUY') {
        entry = currentPrice * (1 + 0.01); // Enter slightly above current price
        stopLoss = currentPrice * (1 - volatilityFactor);
        target = currentPrice * (1 + volatilityFactor * riskReward);
      } else if (direction === 'SELL') {
        entry = currentPrice * (1 - 0.01); // Enter slightly below current price
        stopLoss = currentPrice * (1 + volatilityFactor);
        target = currentPrice * (1 - volatilityFactor * riskReward);
      }

      // Position size based on confidence (1-5% of portfolio)
      const positionSize = Math.min(5, Math.max(1, confidence / 20));

      return {
        suggestedEntry: entry ? Number(entry.toFixed(4)) : undefined,
        suggestedStopLoss: stopLoss ? Number(stopLoss.toFixed(4)) : undefined,
        suggestedTarget: target ? Number(target.toFixed(4)) : undefined,
        positionSize: Number(positionSize.toFixed(1))
      };
    } catch (error) {
      return {};
    }
  }

  private generateReasoning(symbol: string, data: any): string {
    const reasons = [];
    
    // Technical analysis
    if (Math.abs(data.technicalScore) > 0.3) {
      reasons.push(`Technical indicators show ${data.technicalScore > 0 ? 'bullish' : 'bearish'} momentum`);
    }
    
    // Social sentiment
    if (data.socialMentions > 5) {
      reasons.push(`${data.socialMentions} social mentions with ${data.socialScore > 0 ? 'positive' : 'negative'} sentiment`);
    }
    
    // Telegram signals
    if (data.telegramMentions > 2) {
      reasons.push(`${data.telegramMentions} Telegram mentions trending ${data.telegramScore > 0 ? 'bullish' : 'bearish'}`);
    }
    
    // Indian market data
    if (data.indianMarketScore && Math.abs(data.indianMarketScore) > 0.2) {
      reasons.push(`Indian market showing ${data.indianMarketScore > 0 ? 'strength' : 'weakness'}`);
    }
    
    // News sentiment
    if (Math.abs(data.newsScore) > 0.2) {
      reasons.push(`News sentiment is ${data.newsScore > 0 ? 'positive' : 'negative'}`);
    }

    // Fusion score
    reasons.push(`Combined AI score: ${data.finalScore > 0 ? '+' : ''}${(data.finalScore * 100).toFixed(1)}%`);

    return reasons.join('. ') || `${symbol} fusion analysis complete`;
  }

  private calculateSentimentMomentum(socialScore: number, telegramScore: number): number {
    // Calculate momentum based on alignment of sentiment sources
    const alignment = 1 - Math.abs(socialScore - telegramScore);
    const avgSentiment = (socialScore + telegramScore) / 2;
    return alignment * Math.abs(avgSentiment);
  }

  private calculateVolumeIndicator(socialMentions: number, telegramMentions: number): number {
    const totalMentions = socialMentions + telegramMentions;
    return Math.min(1, totalMentions / 100); // Normalize to 0-1
  }

  private getUsedDataSources(availability: { [key: string]: boolean }): string[] {
    const sources = [];
    if (availability.technicalData) sources.push('Technical Analysis');
    if (availability.socialData) sources.push('Social Sentiment');
    if (availability.telegramData) sources.push('Telegram Signals');
    if (availability.indianMarketData) sources.push('Indian Market Data');
    if (availability.newsData) sources.push('News Analysis');
    return sources;
  }

  private getMockCurrentPrice(symbol: string): number | null {
    // Mock current prices for demo
    const prices: { [key: string]: number } = {
      'BTC': 43500,
      'ETH': 2650,
      'ADA': 0.48,
      'SOL': 98,
      'MATIC': 0.82,
      'RELIANCE': 2850,
      'TCS': 4200,
      'HDFCBANK': 1650,
      'INFY': 1850
    };
    
    return prices[symbol] || prices[symbol.replace(/USD|USDT|-EQ/g, '')] || null;
  }

  private generateMockMarketData(symbol: string, periods: number): any[] {
    const data = [];
    const basePrice = this.getMockCurrentPrice(symbol) || 100;
    let currentPrice = basePrice;

    for (let i = 0; i < periods; i++) {
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * 2;
      const open = currentPrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      data.push({
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(Date.now() - (periods - i) * 60 * 60 * 1000)
      });

      currentPrice = close;
    }

    return data;
  }

  // Main fusion signal generator - processes multiple symbols
  async runFusionAnalysis(symbols?: string[]): Promise<FusionSignal[]> {
    const targetSymbols = symbols || ['BTC', 'ETH', 'ADA', 'SOL', 'RELIANCE', 'TCS'];
    const fusionSignals: FusionSignal[] = [];

    console.log('🚀 Running comprehensive fusion analysis...');

    for (const symbol of targetSymbols) {
      try {
        const signal = await this.generateFusionSignal(symbol);
        fusionSignals.push(signal);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to generate fusion signal for ${symbol}:`, error);
      }
    }

    console.log(`✅ Generated ${fusionSignals.length} fusion signals`);
    return fusionSignals;
  }

  async getLatestFusionSignals(limit: number = 10): Promise<FusionSignal[]> {
    return (await this.storage.getFusionSignals?.(limit)) || [];
  }

  getDataSourceStatus(): DataSource[] {
    return [
      {
        name: 'Technical Analysis',
        weight: this.dataSourceWeights.technical,
        isAvailable: true,
        lastUpdate: new Date()
      },
      {
        name: 'Social Sentiment',
        weight: this.dataSourceWeights.social,
        isAvailable: true,
        lastUpdate: new Date()
      },
      {
        name: 'Telegram Intelligence',
        weight: this.dataSourceWeights.telegram,
        isAvailable: this.telegramScraper.isConnected(),
        lastUpdate: new Date()
      },
      {
        name: 'Indian Market Data',
        weight: this.dataSourceWeights.indianMarket,
        isAvailable: this.angelBroking.isConnected(),
        lastUpdate: new Date()
      },
      {
        name: 'News Analysis',
        weight: this.dataSourceWeights.news,
        isAvailable: true,
        lastUpdate: new Date()
      }
    ];
  }
}

export type { FusionSignal, DataSource };