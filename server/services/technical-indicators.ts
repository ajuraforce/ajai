import { RSI, MACD, SMA, EMA, BollingerBands, StochasticRSI } from 'technicalindicators';

export interface TechnicalIndicators {
  rsi: number | undefined;
  macd: {
    value: number | undefined;
    signal: number | undefined;
    histogram: number | undefined;
  };
  sma20: number | undefined;
  sma50: number | undefined;
  ema12: number | undefined;
  ema26: number | undefined;
  bollingerBands: {
    upper: number | undefined;
    middle: number | undefined;
    lower: number | undefined;
  };
  stochRSI: {
    k: number | undefined;
    d: number | undefined;
  };
}

export interface MarketDataPoint {
  close: number;
  high: number;
  low: number;
  open: number;
  volume?: number;
  timestamp: Date;
}

export class TechnicalAnalysisService {
  /**
   * Calculate comprehensive technical indicators for given price data
   */
  static calculateIndicators(
    priceData: MarketDataPoint[],
    rsiPeriod = 14,
    smaPeriods = [20, 50],
    emaPeriods = [12, 26],
    macdParams = { fast: 12, slow: 26, signal: 9 },
    bbPeriod = 20,
    bbStdDev = 2
  ): TechnicalIndicators {
    
    if (priceData.length < Math.max(rsiPeriod, Math.max(...smaPeriods), bbPeriod, macdParams.slow)) {
      return this.getEmptyIndicators();
    }

    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);

    // RSI
    const rsiValues = RSI.calculate({ values: closes, period: rsiPeriod });
    const rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : undefined;

    // MACD
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: macdParams.fast,
      slowPeriod: macdParams.slow,
      signalPeriod: macdParams.signal
    });
    const latestMacd = macdValues.length > 0 ? macdValues[macdValues.length - 1] : undefined;

    // Simple Moving Averages
    const sma20Values = SMA.calculate({ values: closes, period: smaPeriods[0] });
    const sma50Values = SMA.calculate({ values: closes, period: smaPeriods[1] });
    const sma20 = sma20Values.length > 0 ? sma20Values[sma20Values.length - 1] : undefined;
    const sma50 = sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : undefined;

    // Exponential Moving Averages
    const ema12Values = EMA.calculate({ values: closes, period: emaPeriods[0] });
    const ema26Values = EMA.calculate({ values: closes, period: emaPeriods[1] });
    const ema12 = ema12Values.length > 0 ? ema12Values[ema12Values.length - 1] : undefined;
    const ema26 = ema26Values.length > 0 ? ema26Values[ema26Values.length - 1] : undefined;

    // Bollinger Bands
    const bbValues = BollingerBands.calculate({
      values: closes,
      period: bbPeriod,
      stdDev: bbStdDev
    });
    const latestBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : undefined;

    // Stochastic RSI
    const stochRSIValues = StochasticRSI.calculate({
      values: closes,
      rsiPeriod: rsiPeriod,
      stochasticPeriod: 14,
      kPeriod: 3,
      dPeriod: 3
    });
    const latestStochRSI = stochRSIValues.length > 0 ? stochRSIValues[stochRSIValues.length - 1] : undefined;

    return {
      rsi,
      macd: {
        value: latestMacd?.MACD,
        signal: latestMacd?.signal,
        histogram: latestMacd?.histogram
      },
      sma20,
      sma50,
      ema12,
      ema26,
      bollingerBands: {
        upper: latestBB?.upper,
        middle: latestBB?.middle,
        lower: latestBB?.lower
      },
      stochRSI: {
        k: latestStochRSI?.k,
        d: latestStochRSI?.d
      }
    };
  }

  /**
   * Generate trading signals based on technical indicators
   */
  static generateSignals(indicators: TechnicalIndicators, currentPrice: number): {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
  } {
    const signals: Array<{ signal: 'BUY' | 'SELL' | 'HOLD'; weight: number; reason: string }> = [];
    const reasoning: string[] = [];

    // RSI Signals
    if (indicators.rsi !== undefined) {
      if (indicators.rsi < 30) {
        signals.push({ signal: 'BUY', weight: 0.3, reason: 'RSI oversold condition' });
        reasoning.push(`RSI at ${indicators.rsi.toFixed(2)} indicates oversold`);
      } else if (indicators.rsi > 70) {
        signals.push({ signal: 'SELL', weight: 0.3, reason: 'RSI overbought condition' });
        reasoning.push(`RSI at ${indicators.rsi.toFixed(2)} indicates overbought`);
      }
    }

    // MACD Signals
    if (indicators.macd.value !== undefined && indicators.macd.signal !== undefined) {
      if (indicators.macd.value > indicators.macd.signal) {
        signals.push({ signal: 'BUY', weight: 0.25, reason: 'MACD bullish crossover' });
        reasoning.push('MACD line above signal line (bullish)');
      } else {
        signals.push({ signal: 'SELL', weight: 0.25, reason: 'MACD bearish crossover' });
        reasoning.push('MACD line below signal line (bearish)');
      }
    }

    // SMA Trend Signals
    if (indicators.sma20 !== undefined && indicators.sma50 !== undefined) {
      if (indicators.sma20 > indicators.sma50 && currentPrice > indicators.sma20) {
        signals.push({ signal: 'BUY', weight: 0.2, reason: 'Price above rising SMA20' });
        reasoning.push('Price trending above short-term moving average');
      } else if (indicators.sma20 < indicators.sma50 && currentPrice < indicators.sma20) {
        signals.push({ signal: 'SELL', weight: 0.2, reason: 'Price below falling SMA20' });
        reasoning.push('Price trending below short-term moving average');
      }
    }

    // Bollinger Bands Signals
    if (indicators.bollingerBands.upper !== undefined && indicators.bollingerBands.lower !== undefined) {
      if (currentPrice <= indicators.bollingerBands.lower) {
        signals.push({ signal: 'BUY', weight: 0.15, reason: 'Price at lower Bollinger Band' });
        reasoning.push('Price touching lower Bollinger Band (potential reversal)');
      } else if (currentPrice >= indicators.bollingerBands.upper) {
        signals.push({ signal: 'SELL', weight: 0.15, reason: 'Price at upper Bollinger Band' });
        reasoning.push('Price touching upper Bollinger Band (potential reversal)');
      }
    }

    // Stochastic RSI Signals
    if (indicators.stochRSI.k !== undefined && indicators.stochRSI.d !== undefined) {
      if (indicators.stochRSI.k < 20 && indicators.stochRSI.d < 20) {
        signals.push({ signal: 'BUY', weight: 0.1, reason: 'StochRSI oversold' });
        reasoning.push('Stochastic RSI indicates oversold conditions');
      } else if (indicators.stochRSI.k > 80 && indicators.stochRSI.d > 80) {
        signals.push({ signal: 'SELL', weight: 0.1, reason: 'StochRSI overbought' });
        reasoning.push('Stochastic RSI indicates overbought conditions');
      }
    }

    // Calculate weighted signal
    const buyWeight = signals.filter(s => s.signal === 'BUY').reduce((sum, s) => sum + s.weight, 0);
    const sellWeight = signals.filter(s => s.signal === 'SELL').reduce((sum, s) => sum + s.weight, 0);

    let finalSignal: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (buyWeight > sellWeight) {
      finalSignal = 'BUY';
      confidence = Math.min(95, Math.round((buyWeight / (buyWeight + sellWeight)) * 100));
    } else if (sellWeight > buyWeight) {
      finalSignal = 'SELL';
      confidence = Math.min(95, Math.round((sellWeight / (buyWeight + sellWeight)) * 100));
    } else {
      finalSignal = 'HOLD';
      confidence = 50;
      reasoning.push('Technical indicators are neutral');
    }

    return {
      signal: finalSignal,
      confidence,
      reasoning
    };
  }

  private static getEmptyIndicators(): TechnicalIndicators {
    return {
      rsi: undefined,
      macd: { value: undefined, signal: undefined, histogram: undefined },
      sma20: undefined,
      sma50: undefined,
      ema12: undefined,
      ema26: undefined,
      bollingerBands: { upper: undefined, middle: undefined, lower: undefined },
      stochRSI: { k: undefined, d: undefined }
    };
  }

  /**
   * Generate mock historical data for testing
   */
  static generateMockData(symbol: string, days = 60): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    let basePrice = 100 + Math.random() * 400; // Random base between 100-500
    
    for (let i = 0; i < days; i++) {
      const volatility = 0.02; // 2% daily volatility
      const change = (Math.random() - 0.5) * volatility * 2;
      const open = basePrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
      });
      
      basePrice = close;
    }
    
    return data;
  }
}