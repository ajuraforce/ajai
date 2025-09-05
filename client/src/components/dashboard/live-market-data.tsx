import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { useNotificationHelpers } from '@/components/ui/notification-system';

interface LivePrice {
  symbol: string;
  price: number;
  timestamp: string;
}

interface MarketTicker {
  symbol: string;
  priceChange: number | null;
  priceChangePercent: number | null;
  lastPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  volume: number;
}

interface MarketDataItem {
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  timestamp: string;
  market_type: 'crypto' | 'equity';
}

interface MarketDataResponse {
  success: boolean;
  data: MarketDataItem[];
  featured: MarketDataItem | null;
}

export default function LiveMarketData() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY50'); // Changed default to NIFTY50 
  const [marketType, setMarketType] = useState<'crypto' | 'equity'>('equity'); // Changed default to equity to show NIFTY50
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const { success, error } = useNotificationHelpers();

  // Fetch enhanced market data with type support (from attachment)
  const { data: marketData, refetch: refetchMarketData, isLoading: marketDataLoading } = useQuery<MarketDataResponse>({
    queryKey: ['/api/market-data', marketType],
    refetchInterval: refreshInterval
  });

  // Fetch live prices (legacy support)
  const { data: livePrices, refetch: refetchPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/live-prices'],
    refetchInterval: refreshInterval
  });

  // Fetch selected symbol ticker
  const { data: ticker, isLoading: tickerLoading } = useQuery({
    queryKey: ['/api/market-ticker', selectedSymbol],
    refetchInterval: refreshInterval,
    enabled: !!selectedSymbol
  });

  // Fetch trading pairs
  const { data: tradingPairs } = useQuery({
    queryKey: ['/api/trading-pairs']
  });

  // Fetch market status
  const { data: marketStatus } = useQuery({
    queryKey: ['/api/market-status'],
    refetchInterval: 30000 // 30 seconds
  });

  const handleRefresh = () => {
    refetchPrices();
    refetchMarketData();
    success('Market data refreshed');
  };

  const handleMarketTypeChange = (newType: 'crypto' | 'equity') => {
    setMarketType(newType);
    // Update selected symbol based on market type
    if (newType === 'crypto') {
      setSelectedSymbol('BTCUSDT');
    } else {
      setSelectedSymbol('NIFTY50'); // Changed default to NIFTY50
    }
  };

  const formatPrice = (price: number) => {
    if (marketType === 'crypto') {
      // Format crypto prices with $ (from attachment)
      if (price >= 1000) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(price);
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 8
      }).format(price);
    } else {
      // Format equity prices with ₹ (from attachment)
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(price);
    }
  };

  const formatChange = (change: number | null | undefined) => {
    if (change === null || change === undefined || isNaN(change)) {
      return '0.00%';
    }
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Market Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Badge 
              variant={marketStatus?.binanceConnected ? "default" : "destructive"}
              data-testid="badge-market-status"
            >
              {marketStatus?.binanceConnected ? 'Connected' : 'Simulated'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {marketStatus?.totalUsers || 0} users • Last update: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Market Data</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Market Type Toggle (from attachment) */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => handleMarketTypeChange('crypto')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    marketType === 'crypto' 
                      ? 'bg-orange-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid="button-crypto-toggle"
                >
                  CRYPTO
                </button>
                <button
                  onClick={() => handleMarketTypeChange('equity')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    marketType === 'equity' 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid="button-equity-toggle"
                >
                  EQUITY
                </button>
              </div>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32" data-testid="select-symbol">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {marketType === 'crypto' ? (
                    ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT'].map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair.replace('USDT', '/USD')}
                      </SelectItem>
                    ))
                  ) : (
                    ['NIFTY50', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HINDUNILVR', 'ITC'].map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={pricesLoading}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Selected Symbol Details */}
          {ticker && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold" data-testid="text-current-price">
                  {formatPrice(ticker.lastPrice || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h Change</p>
                <p className={`text-lg font-semibold ${(ticker.priceChangePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatChange(ticker.priceChangePercent)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h High</p>
                <p className="text-lg font-medium">{formatPrice(ticker.highPrice || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h Low</p>
                <p className="text-lg font-medium">{formatPrice(ticker.lowPrice || 0)}</p>
              </div>
            </div>
          )}

          {/* Enhanced Live Prices Grid (from attachment) */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Live Prices</h3>
            {marketDataLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading {marketType} market data...</p>
              </div>
            ) : marketData?.success ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {marketData.data?.map((item: MarketDataItem) => (
                  <Card key={item.symbol} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-symbol-${item.symbol}`}>
                          {marketType === 'crypto' 
                            ? item.symbol.replace('USDT', '/USD')
                            : item.symbol
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" data-testid={`text-price-${item.symbol}`}>
                          {formatPrice(item.current_price)}
                        </p>
                        <div className="flex items-center">
                          {item.price_change_percent_24h >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className={`text-xs ${item.price_change_percent_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatChange(item.price_change_percent_24h)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No {marketType} data available</p>
                <Button onClick={handleRefresh} variant="outline" className="mt-2">
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}