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
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export default function LiveMarketData() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const { success, error } = useNotificationHelpers();

  // Fetch live prices
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
    success('Market data refreshed');
  };

  const formatPrice = (price: number) => {
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
  };

  const formatChange = (change: number) => {
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
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32" data-testid="select-symbol">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {tradingPairs?.slice(0, 10).map((pair: string) => (
                    <SelectItem key={pair} value={pair}>
                      {pair}
                    </SelectItem>
                  ))}
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
                  {formatPrice(ticker.lastPrice)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h Change</p>
                <p className={`text-lg font-semibold ${ticker.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatChange(ticker.priceChangePercent)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h High</p>
                <p className="text-lg font-medium">{formatPrice(ticker.highPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">24h Low</p>
                <p className="text-lg font-medium">{formatPrice(ticker.lowPrice)}</p>
              </div>
            </div>
          )}

          {/* Live Prices Grid */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Live Prices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {livePrices?.map((price: LivePrice) => {
                const isPositive = Math.random() > 0.5; // Simulated change direction
                return (
                  <Card key={price.symbol} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{price.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(price.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(price.price)}</p>
                        <div className="flex items-center">
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : '-'}{(Math.random() * 5).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {pricesLoading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading market data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}