import { RSI, MACD, SMA, EMA, BollingerBands } from 'technicalindicators';
import OpenAI from 'openai';

export interface MarketDataPoint {
  price: number;
  volume: number;
  timestamp: Date;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface EnhancedSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  technicalScore: number;
  newsScore: number;
  combinedScore: number;
  indicators: TechnicalIndicators;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
}

export class EnhancedSignalGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'demo-key'
    });
  }

  calculateTechnicalIndicators(marketData: MarketDataPoint[]): TechnicalIndicators {
    const closes = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    const volumes = marketData.map(d => d.volume);

    // Ensure we have enough data
    if (closes.length < 50) {
      throw new Error('Insufficient historical data for technical analysis');
    }

    // Calculate indicators
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const macdValues = MACD.calculate({ 
      values: closes, 
      fastPeriod: 12, 
      slowPeriod: 26, 
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const sma20Values = SMA.calculate({ values: closes, period: 20 });
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    const ema12Values = EMA.calculate({ values: closes, period: 12 });
    const ema26Values = EMA.calculate({ values: closes, period: 26 });
    const bbValues = BollingerBands.calculate({ 
      values: closes, 
      period: 20, 
      stdDev: 2 
    });

    const currentRSI = rsiValues[rsiValues.length - 1] || 50;
    const currentMACD = macdValues[macdValues.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
    const macdValue = currentMACD?.MACD || 0;
    const macdSignal = currentMACD?.signal || 0;
    const macdHistogram = currentMACD?.histogram || 0;
    const currentSMA20 = sma20Values[sma20Values.length - 1] || closes[closes.length - 1];
    const currentSMA50 = sma50Values[sma50Values.length - 1] || closes[closes.length - 1];
    const currentEMA12 = ema12Values[ema12Values.length - 1] || closes[closes.length - 1];
    const currentEMA26 = ema26Values[ema26Values.length - 1] || closes[closes.length - 1];
    const currentBB = bbValues[bbValues.length - 1] || { upper: 0, middle: 0, lower: 0 };

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    const currentPrice = closes[closes.length - 1];
    
    if (currentEMA12 > currentEMA26 && currentPrice > currentSMA20 && macdValue > 0) {
      trend = 'bullish';
    } else if (currentEMA12 < currentEMA26 && currentPrice < currentSMA20 && macdValue < 0) {
      trend = 'bearish';
    }

    return {
      rsi: currentRSI,
      macd: {
        value: macdValue,
        signal: macdSignal,
        histogram: macdHistogram
      },
      sma20: currentSMA20,
      sma50: currentSMA50,
      ema12: currentEMA12,
      ema26: currentEMA26,
      bollingerBands: {
        upper: currentBB.upper,
        middle: currentBB.middle,
        lower: currentBB.lower
      },
      trend
    };
  }

  calculateTechnicalScore(indicators: TechnicalIndicators, currentPrice: number): number {
    let score = 0;
    let factors = 0;

    // RSI scoring (30-70 neutral zone)
    if (indicators.rsi < 30) {
      score += 0.8; // Oversold - bullish signal
    } else if (indicators.rsi > 70) {
      score -= 0.8; // Overbought - bearish signal
    } else {
      score += (50 - indicators.rsi) / 50; // Neutral zone
    }
    factors++;

    // MACD scoring
    if (indicators.macd.value > indicators.macd.signal && indicators.macd.histogram > 0) {
      score += 0.7; // Bullish crossover
    } else if (indicators.macd.value < indicators.macd.signal && indicators.macd.histogram < 0) {
      score -= 0.7; // Bearish crossover
    }
    factors++;

    // Moving average scoring
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      score += 0.6; // Price above short-term MA, uptrend
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      score -= 0.6; // Price below short-term MA, downtrend
    }
    factors++;

    // Bollinger Bands scoring
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    if (bbPosition < 0.2) {
      score += 0.5; // Near lower band - potential bounce
    } else if (bbPosition > 0.8) {
      score -= 0.5; // Near upper band - potential reversal
    }
    factors++;

    // Trend confirmation
    if (indicators.trend === 'bullish') {
      score += 0.4;
    } else if (indicators.trend === 'bearish') {
      score -= 0.4;
    }
    factors++;

    return score / factors; // Normalize to -1 to 1 range
  }

  filterSignalByML(signal: EnhancedSignal): boolean {
    // Simple ML-inspired filtering logic
    // In production, this would use a trained ML model
    
    const minConfidence = 0.65;
    const rsiOversoldThreshold = 25;
    const rsiOverboughtThreshold = 75;
    
    // Filter out low confidence signals
    if (signal.confidence < minConfidence) {
      return false;
    }

    // Filter conflicting signals
    if (signal.action === 'BUY' && signal.indicators.rsi > rsiOverboughtThreshold) {
      return false; // Don't buy when severely overbought
    }
    
    if (signal.action === 'SELL' && signal.indicators.rsi < rsiOversoldThreshold) {
      return false; // Don't sell when severely oversold
    }

    // Ensure MACD confirms the signal
    if (signal.action === 'BUY' && signal.indicators.macd.histogram < -0.5) {
      return false; // Strong bearish momentum
    }
    
    if (signal.action === 'SELL' && signal.indicators.macd.histogram > 0.5) {
      return false; // Strong bullish momentum
    }

    return true;
  }

  ensembleSignal(technicalScore: number, newsScore: number, forecastScore: number = 0): {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    combinedScore: number;
  } {
    // Weighted ensemble: 50% technical, 30% news, 20% forecast
    const combinedScore = (technicalScore * 0.5) + (newsScore * 0.3) + (forecastScore * 0.2);
    
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (combinedScore > 0.4) {
      action = 'BUY';
      confidence = Math.min(combinedScore * 100, 95);
    } else if (combinedScore < -0.4) {
      action = 'SELL';
      confidence = Math.min(Math.abs(combinedScore) * 100, 95);
    } else {
      action = 'HOLD';
      confidence = 50 + Math.abs(combinedScore) * 50;
    }

    return { action, confidence, combinedScore };
  }

  async generateEnhancedSignal(
    symbol: string, 
    marketData: MarketDataPoint[], 
    newsArticles: any[] = [],
    currentPrice: number
  ): Promise<EnhancedSignal> {
    try {
      // Ensure minimum data requirements with flexible fallback
      if (marketData.length < 20) {
        console.warn(`Limited market data for ${symbol}: ${marketData.length} candles, using simplified analysis`);
        return this.generateSimplifiedSignal(symbol, marketData, newsArticles, currentPrice);
      }

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(marketData);
      
      // Calculate technical score
      const technicalScore = this.calculateTechnicalScore(indicators, currentPrice);
      
      // Calculate news sentiment score (simplified)
      const newsScore = this.calculateNewsScore(newsArticles);
      
      // Generate ensemble signal
      const ensemble = this.ensembleSignal(technicalScore, newsScore);
      
      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(indicators, ensemble.combinedScore);
      
      // Generate price targets
      const { targetPrice, stopLoss } = this.calculatePriceTargets(
        currentPrice, 
        ensemble.action, 
        indicators
      );

      const signal: EnhancedSignal = {
        symbol,
        action: ensemble.action,
        confidence: ensemble.confidence,
        price: currentPrice,
        targetPrice,
        stopLoss,
        reasoning: this.generateReasoning(indicators, newsScore, ensemble.action),
        technicalScore,
        newsScore,
        combinedScore: ensemble.combinedScore,
        indicators,
        riskLevel,
        timeframe: '1h'
      };

      // Apply ML filtering
      if (!this.filterSignalByML(signal)) {
        signal.action = 'HOLD';
        signal.confidence = 30;
        signal.reasoning += ' (Filtered by ML due to conflicting indicators)';
      }

      return signal;
      
    } catch (error) {
      console.error('Enhanced signal generation error:', error);
      
      // Fallback to basic signal
      return {
        symbol,
        action: 'HOLD',
        confidence: 30,
        price: currentPrice,
        targetPrice: currentPrice,
        stopLoss: currentPrice * 0.95,
        reasoning: 'Insufficient data for enhanced analysis',
        technicalScore: 0,
        newsScore: 0,
        combinedScore: 0,
        indicators: {
          rsi: 50,
          macd: { value: 0, signal: 0, histogram: 0 },
          sma20: currentPrice,
          sma50: currentPrice,
          ema12: currentPrice,
          ema26: currentPrice,
          bollingerBands: { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 },
          trend: 'neutral'
        },
        riskLevel: 'MEDIUM',
        timeframe: '1h'
      };
    }
  }

  private calculateNewsScore(newsArticles: any[]): number {
    if (!newsArticles.length) return 0;

    let totalSentiment = 0;
    let relevantCount = 0;

    newsArticles.forEach(article => {
      if (article.sentimentScore !== undefined) {
        // Convert sentiment score to -1 to 1 range
        const normalizedScore = (article.sentimentScore - 0.5) * 2;
        totalSentiment += normalizedScore * (article.relevanceScore || 0.5);
        relevantCount++;
      }
    });

    return relevantCount > 0 ? totalSentiment / relevantCount : 0;
  }

  private calculateRiskLevel(indicators: TechnicalIndicators, combinedScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskFactors = 0;

    // High RSI = higher risk
    if (indicators.rsi > 80 || indicators.rsi < 20) riskFactors++;
    
    // Conflicting signals = higher risk
    if (Math.abs(combinedScore) < 0.3) riskFactors++;
    
    // High volatility indicators = higher risk
    if (Math.abs(indicators.macd.histogram) > 1) riskFactors++;

    if (riskFactors >= 2) return 'HIGH';
    if (riskFactors === 1) return 'MEDIUM';
    return 'LOW';
  }

  private calculatePriceTargets(currentPrice: number, action: string, indicators: TechnicalIndicators): {
    targetPrice: number;
    stopLoss: number;
  } {
    const volatility = Math.abs(indicators.bollingerBands.upper - indicators.bollingerBands.lower) / indicators.bollingerBands.middle;
    
    if (action === 'BUY') {
      return {
        targetPrice: currentPrice * (1 + volatility * 1.5),
        stopLoss: currentPrice * (1 - volatility * 0.8)
      };
    } else if (action === 'SELL') {
      return {
        targetPrice: currentPrice * (1 - volatility * 1.5),
        stopLoss: currentPrice * (1 + volatility * 0.8)
      };
    } else {
      return {
        targetPrice: currentPrice,
        stopLoss: currentPrice * 0.95
      };
    }
  }

  private generateReasoning(indicators: TechnicalIndicators, newsScore: number, action: string): string {
    const reasons = [];

    if (action === 'BUY') {
      if (indicators.rsi < 35) reasons.push('RSI indicates oversold conditions');
      if (indicators.macd.histogram > 0) reasons.push('MACD showing bullish momentum');
      if (indicators.trend === 'bullish') reasons.push('Strong uptrend confirmed');
      if (newsScore > 0.2) reasons.push('Positive news sentiment');
    } else if (action === 'SELL') {
      if (indicators.rsi > 65) reasons.push('RSI indicates overbought conditions');
      if (indicators.macd.histogram < 0) reasons.push('MACD showing bearish momentum');
      if (indicators.trend === 'bearish') reasons.push('Downtrend confirmed');
      if (newsScore < -0.2) reasons.push('Negative news sentiment');
    } else {
      reasons.push('Mixed signals suggest waiting for clearer direction');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Technical analysis suggests current action';
  }

  // Simplified signal generation for limited data scenarios
  generateSimplifiedSignal(
    symbol: string,
    marketData: MarketDataPoint[],
    newsArticles: any[],
    currentPrice: number
  ): EnhancedSignal {
    const closes = marketData.map(d => d.close);
    const latest = marketData[marketData.length - 1];
    
    // Simple moving average for trend
    const avgPrice = closes.reduce((sum, price) => sum + price, 0) / closes.length;
    const priceChange = ((currentPrice - avgPrice) / avgPrice) * 100;
    
    // Basic sentiment from news
    const newsScore = this.calculateNewsScore(newsArticles);
    
    // Simple signal logic
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 40;
    
    if (priceChange < -5 && newsScore > 0) {
      action = 'BUY';
      confidence = 60;
    } else if (priceChange > 5 && newsScore < 0) {
      action = 'SELL';
      confidence = 60;
    }
    
    // Mock indicators for simplified signal
    const mockIndicators: TechnicalIndicators = {
      rsi: 50 - priceChange,
      macd: { value: 0, signal: 0, histogram: 0 },
      sma20: avgPrice,
      sma50: avgPrice,
      ema12: currentPrice,
      ema26: avgPrice,
      bollingerBands: { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 },
      trend: priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'neutral'
    };
    
    return {
      symbol,
      action,
      confidence,
      price: currentPrice,
      targetPrice: action === 'BUY' ? currentPrice * 1.03 : currentPrice * 0.97,
      stopLoss: action === 'BUY' ? currentPrice * 0.98 : currentPrice * 1.02,
      reasoning: `Simplified analysis based on ${marketData.length} data points. Price change: ${priceChange.toFixed(2)}%, News sentiment: ${newsScore.toFixed(2)}`,
      technicalScore: priceChange / 10,
      newsScore,
      combinedScore: (priceChange / 10 + newsScore) / 2,
      indicators: mockIndicators,
      riskLevel: 'MEDIUM',
      timeframe: '1h'
    };
  }
}

export const enhancedSignalGenerator = new EnhancedSignalGenerator();