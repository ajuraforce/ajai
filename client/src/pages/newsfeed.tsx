import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Globe, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { NewPageLayout } from "@/components/ui/new-navigation";

export default function NewsFeed() {
  const { data: articles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["/api/news"],
    refetchInterval: 30000,
  });

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish": return "🟢";
      case "bearish": return "🔴";
      default: return "🟡";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish": return "border-l-green-500 bg-green-50/30 dark:bg-green-950/10";
      case "bearish": return "border-l-red-500 bg-red-50/30 dark:bg-red-950/10";
      default: return "border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10";
    }
  };

  const getBadgeColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish": return "bg-green-500/20 text-green-600 border-green-200";
      case "bearish": return "bg-red-500/20 text-red-600 border-red-200";
      default: return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
    }
  };

  if (isLoading) {
    return (
      <NewPageLayout>
        <div className="container mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Live News Feed</h1>
          </div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </NewPageLayout>
    );
  }

  return (
    <NewPageLayout>
      <div className="container mx-auto space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Live News Feed</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Auto-refresh</span>
          </div>
          
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feed Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{articles.length}</div>
            <div className="text-xs text-muted-foreground">Total Articles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">
              {articles.filter((a: any) => a.sentiment?.toLowerCase() === 'bullish').length}
            </div>
            <div className="text-xs text-muted-foreground">Bullish</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-red-600">
              {articles.filter((a: any) => a.sentiment?.toLowerCase() === 'bearish').length}
            </div>
            <div className="text-xs text-muted-foreground">Bearish</div>
          </CardContent>
        </Card>
      </div>

      {/* News Feed */}
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        {articles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No articles available</h3>
              <p className="text-muted-foreground">Check back soon for the latest market news</p>
            </CardContent>
          </Card>
        ) : (
          articles.map((article: any) => (
            <Card 
              key={article.id} 
              className={`border-l-4 hover:shadow-md transition-shadow ${getSentimentColor(article.sentiment)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {/* Sentiment Emoji */}
                  <div className="text-lg mt-0.5 flex-shrink-0">
                    {getSentimentEmoji(article.sentiment)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium leading-tight line-clamp-2 pr-2">
                        {article.title}
                      </h4>
                      <Badge className={`text-xs px-2 py-1 flex-shrink-0 ${getBadgeColor(article.sentiment)}`}>
                        {article.sentiment || 'Neutral'}
                      </Badge>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {article.description}
                    </p>

                    {/* Enhanced Analysis Preview */}
                    {article.deepAnalysis?.scenarioAnalysis && (
                      <div className="bg-muted/30 rounded p-2 mb-3">
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="font-medium text-muted-foreground">Market Probability:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">
                              ↗ {Math.round((article.deepAnalysis.scenarioAnalysis.bullish || 0) * 100)}%
                            </span>
                            <span className="text-red-600">
                              ↘ {Math.round((article.deepAnalysis.scenarioAnalysis.bearish || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{article.source}</span>
                        {article.deepAnalysis && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            🧠 AI
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { 
                            addSuffix: true 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </NewPageLayout>
  );
}