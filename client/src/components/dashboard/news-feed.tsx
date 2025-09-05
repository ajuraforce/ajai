import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function NewsFeed() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["/api/news"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Market News</h3>
        </div>
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-b border-border pb-4 last:border-b-0 animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish":
        return "🟢";
      case "bearish":
        return "🔴";
      default:
        return "🟡";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish":
        return "bg-green-500/20 text-green-600 border-green-200";
      case "bearish":
        return "bg-red-500/20 text-red-600 border-red-200";
      default:
        return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
    }
  };

  const getNewsCategory = (source: string) => {
    const cryptoSources = ['Cointelegraph', 'CoinDesk', 'Crypto.News', 'Bitcoinist', 'Decrypt'];
    const financialSources = ['CNBC Business', 'Reuters Business', 'WSJ Markets', 'Bloomberg Markets'];
    const geopoliticalSources = ['Reuters World', 'BBC World', 'Al Jazeera'];
    const stockSources = ['Economic Times Markets', 'Business Standard', 'Investing.com Stocks', 'MarketWatch'];
    
    if (cryptoSources.includes(source)) return { name: 'Crypto', color: 'bg-orange-100 text-orange-800' };
    if (financialSources.includes(source)) return { name: 'Financial', color: 'bg-blue-100 text-blue-800' };
    if (geopoliticalSources.includes(source)) return { name: 'Geopolitical', color: 'bg-purple-100 text-purple-800' };
    if (stockSources.includes(source)) return { name: 'Stocks', color: 'bg-green-100 text-green-800' };
    return { name: 'General', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <Card className="border border-border">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Market News</h3>
          <div className="hidden sm:flex items-center space-x-2">
            <span className="status-indicator status-online"></span>
            <span className="text-sm text-muted-foreground">Live Feed</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
        {articles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No news articles available
          </div>
        ) : (
          articles.map((article: any) => (
            <div 
              key={article.id} 
              className="border-b border-border pb-4 last:border-b-0"
              data-testid={`news-article-${article.id}`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-lg mt-1 flex-shrink-0">
                  {getSentimentEmoji(article.sentiment)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 pr-2">
                      {article.title}
                    </h4>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={`text-xs px-2 py-1 ${getSentimentColor(article.sentiment)}`}>
                        {article.sentiment || 'Neutral'}
                      </Badge>
                      {getNewsCategory(article.source) && (
                        <Badge variant="secondary" className={`text-xs px-2 py-1 ${getNewsCategory(article.source).color}`}>
                          {getNewsCategory(article.source).name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {article.description}
                  </p>

                  {/* Enhanced Analysis Section */}
                  {article.deepAnalysis && (
                    <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-2">
                      {/* Scenario Analysis */}
                      {article.deepAnalysis.scenarioAnalysis && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-foreground">Market Scenarios</h5>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-green-600 font-medium">
                                {Math.round((article.deepAnalysis.scenarioAnalysis.bullish || 0) * 100)}%
                              </div>
                              <div className="text-muted-foreground">Bullish</div>
                            </div>
                            <div className="text-center">
                              <div className="text-red-600 font-medium">
                                {Math.round((article.deepAnalysis.scenarioAnalysis.bearish || 0) * 100)}%
                              </div>
                              <div className="text-muted-foreground">Bearish</div>
                            </div>
                            <div className="text-center">
                              <div className="text-yellow-600 font-medium">
                                {Math.round((article.deepAnalysis.scenarioAnalysis.neutral || 0) * 100)}%
                              </div>
                              <div className="text-muted-foreground">Neutral</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* System Connections */}
                      {article.deepAnalysis.systemConnections && article.deepAnalysis.systemConnections.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-foreground">System Links</h5>
                          <div className="flex flex-wrap gap-1">
                            {article.deepAnalysis.systemConnections.slice(0, 3).map((connection: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                                {connection}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meta Reasoning */}
                      {article.deepAnalysis.metaReasoning && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-foreground">AI Insight</h5>
                          <p className="text-xs text-muted-foreground italic">
                            {article.deepAnalysis.metaReasoning}
                          </p>
                        </div>
                      )}

                      {/* Trading Signal */}
                      {article.deepAnalysis.tradingSignal && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Signal:</span>
                          <Badge 
                            className={`text-xs ${
                              article.deepAnalysis.tradingSignal === 'BUY' 
                                ? 'bg-green-500/20 text-green-600 border-green-200'
                                : article.deepAnalysis.tradingSignal === 'SELL'
                                ? 'bg-red-500/20 text-red-600 border-red-200'
                                : 'bg-yellow-500/20 text-yellow-600 border-yellow-200'
                            }`}
                          >
                            {article.deepAnalysis.tradingSignal}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{article.source}</span>
                    <div className="flex items-center space-x-2">
                      {article.sentimentScore && (
                        <span className="font-medium">
                          {article.sentimentScore > 0 ? '+' : ''}{Number(article.sentimentScore).toFixed(1)}
                        </span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}