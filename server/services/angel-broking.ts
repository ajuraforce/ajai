import fetch from 'node-fetch';
import { authenticator } from 'otplib';

interface AngelBrokingConfig {
  clientId: string;
  password: string;
  totpSecret: string;
  marketApiKey: string;
  historicalApiKey: string;
  tradingApiKey: string;
}

interface AngelSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

interface MarketQuote {
  symbol: string;
  exchange: string;
  current_price: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  open_price: number;
  close_price: number;
  timestamp: string;
  market_type: string;
}

interface StockToken {
  symbol: string;
  exchange: string;
  token: string;
}

export class AngelBrokingService {
  private config: AngelBrokingConfig;
  private session: AngelSession | null = null;
  private baseUrl = 'https://apiconnect.angelone.in';

  // Popular Indian stocks with their NSE tokens
  private readonly INDIAN_STOCKS: StockToken[] = [
    { symbol: 'RELIANCE', exchange: 'NSE', token: '2885' },
    { symbol: 'TCS', exchange: 'NSE', token: '11536' },
    { symbol: 'HDFCBANK', exchange: 'NSE', token: '1333' },
    { symbol: 'INFY', exchange: 'NSE', token: '1594' },
    { symbol: 'ICICIBANK', exchange: 'NSE', token: '4963' },
    { symbol: 'HINDUNILVR', exchange: 'NSE', token: '1394' },
    { symbol: 'ITC', exchange: 'NSE', token: '1660' },
    { symbol: 'SBIN', exchange: 'NSE', token: '3045' },
    { symbol: 'BHARTIARTL', exchange: 'NSE', token: '10604' },
    { symbol: 'ASIANPAINT', exchange: 'NSE', token: '236' },
    { symbol: 'NIFTY50', exchange: 'NSE', token: '99926000' },
    { symbol: 'BANKNIFTY', exchange: 'NSE', token: '99926009' }
  ];

  constructor() {
    this.config = {
      clientId: process.env.ANGEL_CLIENT_ID || '',
      password: process.env.ANGEL_PASSWORD || '',
      totpSecret: process.env.ANGEL_TOTP_SECRET || '',
      marketApiKey: process.env.ANGEL_MARKET_API_KEY || '',
      historicalApiKey: process.env.ANGEL_HISTORICAL_API_KEY || '',
      tradingApiKey: process.env.ANGEL_TRADING_API_KEY || ''
    };
  }

  private generateTOTP(secret: string): string {
    try {
      // Use proper TOTP library for Angel Broking authentication
      const token = authenticator.generate(secret);
      console.log(`🔐 Generated TOTP: ${token}`);
      return token;
    } catch (error) {
      console.error('❌ TOTP generation failed:', error);
      return '000000'; // Fallback
    }
  }

  private async generateSession(): Promise<boolean> {
    try {
      if (!this.config.clientId || !this.config.password || !this.config.totpSecret) {
        console.error('❌ Angel Broking credentials not configured');
        return false;
      }

      const totpCode = this.generateTOTP(this.config.totpSecret);
      console.log('🔐 Generated TOTP for Angel authentication');

      const payload = {
        clientcode: this.config.clientId,
        password: this.config.password,
        totp: totpCode
      };

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '192.168.1.1',
        'X-ClientPublicIP': '106.193.147.98',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': this.config.marketApiKey
      };

      const response = await fetch(`${this.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data?.status && data?.data) {
          this.session = {
            jwtToken: data.data.jwtToken,
            refreshToken: data.data.refreshToken,
            feedToken: data.data.feedToken
          };
          console.log('✅ Angel Broking session created successfully');
          return true;
        } else {
          console.error('❌ Angel login failed:', data?.message || 'Unknown error');
          return false;
        }
      } else {
        console.error('❌ Angel API call failed:', response.status);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Angel session error:', error.message);
      return false;
    }
  }

  private async ensureSession(): Promise<boolean> {
    if (!this.session) {
      return await this.generateSession();
    }
    return true;
  }

  private async getMarketQuotes(symbols: StockToken[]): Promise<any[]> {
    if (!await this.ensureSession()) {
      throw new Error('Failed to establish Angel Broking session');
    }

    const headers = {
      'Authorization': `Bearer ${this.session!.jwtToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '192.168.1.1',
      'X-ClientPublicIP': '106.193.147.98',
      'X-MACAddress': '00:00:00:00:00:00',
      'X-PrivateKey': this.config.marketApiKey
    };

    // Group symbols by exchange
    const exchangeTokens: { [key: string]: string[] } = {};
    symbols.forEach(stock => {
      if (!exchangeTokens[stock.exchange]) {
        exchangeTokens[stock.exchange] = [];
      }
      exchangeTokens[stock.exchange].push(stock.token);
    });

    const payload = {
      mode: 'FULL',
      exchangeTokens
    };

    try {
      const response = await fetch(`${this.baseUrl}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data?.status && data?.data?.fetched) {
          return data.data.fetched;
        } else {
          console.error('❌ Market quotes failed:', data?.message);
          return [];
        }
      } else {
        console.error('❌ Market quotes HTTP error:', response.status);
        return [];
      }
    } catch (error: any) {
      console.error('❌ Market quotes error:', error.message);
      // Reset session on auth errors
      if (error.response?.status === 401) {
        this.session = null;
      }
      return [];
    }
  }

  public async getEquityMarketData(): Promise<{ success: boolean; data: MarketQuote[]; error?: string }> {
    try {
      console.log('📊 Fetching Angel Broking equity market data...');
      
      const quotes = await this.getMarketQuotes(this.INDIAN_STOCKS);
      
      if (!quotes || quotes.length === 0) {
        throw new Error('No market quotes received from Angel Broking');
      }

      const formattedData: MarketQuote[] = [];

      quotes.forEach((quote: any) => {
        // Find symbol name from token
        const stockInfo = this.INDIAN_STOCKS.find(stock => 
          quote.symbolToken && quote.symbolToken.includes(stock.token)
        );
        
        if (!stockInfo) return;

        const ltp = parseFloat(quote.ltp || '0');
        const closePrice = parseFloat(quote.close || '0');
        const openPrice = parseFloat(quote.open || '0');
        const highPrice = parseFloat(quote.high || '0');
        const lowPrice = parseFloat(quote.low || '0');
        const volume = parseInt(quote.volume || '0');

        // Calculate 24h change
        const priceChange = ltp - closePrice;
        const priceChangePercent = closePrice !== 0 ? (priceChange / closePrice * 100) : 0;

        formattedData.push({
          symbol: stockInfo.symbol,
          exchange: stockInfo.exchange,
          current_price: ltp,
          price_change_24h: priceChange,
          price_change_percent_24h: priceChangePercent,
          high_24h: highPrice,
          low_24h: lowPrice,
          volume_24h: volume,
          open_price: openPrice,
          close_price: closePrice,
          timestamp: new Date().toISOString(),
          market_type: 'equity'
        });
      });

      // Sort by priority (NIFTY50 first, then by market cap)
      const symbolPriority: { [key: string]: number } = {
        'NIFTY50': 0,
        'BANKNIFTY': 1,
        'RELIANCE': 2,
        'TCS': 3,
        'HDFCBANK': 4,
        'INFY': 5,
        'ICICIBANK': 6,
        'HINDUNILVR': 7,
        'ITC': 8,
        'SBIN': 9,
        'BHARTIARTL': 10,
        'ASIANPAINT': 11
      };

      formattedData.sort((a, b) => 
        (symbolPriority[a.symbol] || 999) - (symbolPriority[b.symbol] || 999)
      );

      console.log(`✅ Retrieved ${formattedData.length} equity quotes from Angel Broking`);
      
      return {
        success: true,
        data: formattedData
      };

    } catch (error: any) {
      console.error('❌ Angel equity data error:', error.message);
      return {
        success: false,
        data: [],
        error: `Angel Broking error: ${error.message}`
      };
    }
  }

  public async getTickerData(symbol: string): Promise<any> {
    try {
      const stockInfo = this.INDIAN_STOCKS.find(stock => stock.symbol === symbol);
      if (!stockInfo) {
        throw new Error(`Symbol ${symbol} not found in Indian stocks list`);
      }

      const quotes = await this.getMarketQuotes([stockInfo]);
      
      if (!quotes || quotes.length === 0) {
        throw new Error(`No ticker data for ${symbol}`);
      }

      const quote = quotes[0];
      const ltp = parseFloat(quote.ltp || '0');
      const closePrice = parseFloat(quote.close || '0');
      const priceChange = ltp - closePrice;
      const priceChangePercent = closePrice !== 0 ? (priceChange / closePrice * 100) : 0;

      return {
        symbol,
        lastPrice: ltp,
        priceChange,
        priceChangePercent,
        highPrice: parseFloat(quote.high || '0'),
        lowPrice: parseFloat(quote.low || '0'),
        volume: parseInt(quote.volume || '0'),
        openPrice: parseFloat(quote.open || '0'),
        closePrice,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error(`❌ Angel ticker error for ${symbol}:`, error.message);
      throw error;
    }
  }

  public isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.password &&
      this.config.totpSecret &&
      this.config.marketApiKey
    );
  }

}

export default AngelBrokingService;