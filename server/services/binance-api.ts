import { Spot } from '@binance/connector';

export interface BinancePrice {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface BinanceKline {
  symbol: string;
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export class BinanceService {
  private client: Spot;
  private isConnected = false;
  
  constructor() {
    // Initialize Binance client (works without API key for public data)
    this.client = new Spot(
      process.env.BINANCE_API_KEY || '', 
      process.env.BINANCE_SECRET_KEY || ''
    );
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple ping
      await this.client.ping();
      this.isConnected = true;
      console.log('✅ Binance API connected successfully');
    } catch (error) {
      console.warn('⚠️  Binance API connection failed, using fallback data:', error);
      this.isConnected = false;
    }
  }

  async getLivePrices(symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT']): Promise<BinancePrice[]> {
    if (!this.isConnected) {
      return this.getFallbackPrices(symbols);
    }

    try {
      const promises = symbols.map(async (symbol) => {
        const response = await this.client.tickerPrice(symbol);
        return {
          symbol,
          price: parseFloat(response.data.price),
          timestamp: new Date().toISOString()
        };
      });

      const prices = await Promise.all(promises);
      console.log(`📊 Fetched live prices for ${prices.length} symbols`);
      return prices;
    } catch (error) {
      console.error('Binance API error:', error);
      return this.getFallbackPrices(symbols);
    }
  }

  async get24hrTicker(symbol: string = 'BTCUSDT'): Promise<any> {
    if (!this.isConnected) {
      return this.getFallback24hrTicker(symbol);
    }

    try {
      const response = await this.client.ticker24hr(symbol);
      const ticker = response.data;
      
      return {
        symbol: ticker.symbol,
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        weightedAvgPrice: parseFloat(ticker.weightedAvgPrice),
        prevClosePrice: parseFloat(ticker.prevClosePrice),
        lastPrice: parseFloat(ticker.lastPrice),
        lastQty: parseFloat(ticker.lastQty),
        bidPrice: parseFloat(ticker.bidPrice),
        askPrice: parseFloat(ticker.askPrice),
        openPrice: parseFloat(ticker.openPrice),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        openTime: ticker.openTime,
        closeTime: ticker.closeTime,
        count: ticker.count
      };
    } catch (error) {
      console.error('Binance 24hr ticker error:', error);
      return this.getFallback24hrTicker(symbol);
    }
  }

  async getKlines(
    symbol: string = 'BTCUSDT', 
    interval: string = '1h', 
    limit: number = 24
  ): Promise<BinanceKline[]> {
    if (!this.isConnected) {
      return this.getFallbackKlines(symbol, limit);
    }

    try {
      const response = await this.client.klines(symbol, interval, { limit });
      const klines = response.data.map((kline: any) => ({
        symbol,
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6]
      }));

      console.log(`📈 Fetched ${klines.length} klines for ${symbol}`);
      return klines;
    } catch (error) {
      console.error('Binance klines error:', error);
      return this.getFallbackKlines(symbol, limit);
    }
  }

  async getTradingPairs(): Promise<string[]> {
    if (!this.isConnected) {
      return ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    }

    try {
      const response = await this.client.exchangeInfo();
      const symbols = response.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
        .slice(0, 20) // Top 20 USDT pairs
        .map((s: any) => s.symbol);
      
      return symbols;
    } catch (error) {
      console.error('Binance exchange info error:', error);
      return ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    }
  }

  // Fallback methods for when Binance API is unavailable
  private getFallbackPrices(symbols: string[]): BinancePrice[] {
    return symbols.map(symbol => {
      const basePrice = this.getBasePriceForSymbol(symbol);
      const volatility = 0.05; // 5% volatility
      const change = (Math.random() - 0.5) * volatility * 2;
      
      return {
        symbol,
        price: basePrice * (1 + change),
        timestamp: new Date().toISOString()
      };
    });
  }

  private getFallback24hrTicker(symbol: string): any {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 0.1; // 10% max change
    const changePercent = change * 100;
    
    return {
      symbol,
      priceChange: basePrice * change,
      priceChangePercent: changePercent,
      weightedAvgPrice: basePrice,
      prevClosePrice: basePrice,
      lastPrice: basePrice * (1 + change),
      bidPrice: basePrice * (1 + change - 0.001),
      askPrice: basePrice * (1 + change + 0.001),
      openPrice: basePrice,
      highPrice: basePrice * (1 + Math.abs(change) + 0.02),
      lowPrice: basePrice * (1 - Math.abs(change) - 0.02),
      volume: Math.floor(Math.random() * 10000000),
      quoteVolume: Math.floor(Math.random() * 100000000),
      openTime: Date.now() - 24 * 60 * 60 * 1000,
      closeTime: Date.now(),
      count: Math.floor(Math.random() * 100000)
    };
  }

  private getFallbackKlines(symbol: string, limit: number): BinanceKline[] {
    const klines: BinanceKline[] = [];
    let basePrice = this.getBasePriceForSymbol(symbol);
    
    for (let i = 0; i < limit; i++) {
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * 2;
      const open = basePrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      klines.push({
        symbol,
        openTime: Date.now() - (limit - i) * 60 * 60 * 1000,
        open: open.toFixed(8),
        high: high.toFixed(8),
        low: low.toFixed(8),
        close: close.toFixed(8),
        volume: (Math.random() * 1000).toFixed(8),
        closeTime: Date.now() - (limit - i - 1) * 60 * 60 * 1000
      });
      
      basePrice = close;
    }
    
    return klines;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 0.5,
      'SOLUSDT': 100,
      'DOGEUSDT': 0.08,
      'XRPUSDT': 0.6,
      'BNBUSDT': 300,
      'MATICUSDT': 0.9,
      'AVAXUSDT': 35,
      'DOTUSDT': 6
    };
    
    return basePrices[symbol] || 100;
  }

  isApiConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const binanceService = new BinanceService();