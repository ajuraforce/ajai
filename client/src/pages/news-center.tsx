import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Globe, TrendingUp, Calendar, ExternalLink, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { NewPageLayout } from "@/components/ui/new-navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function NewsCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["/api/news"],
    refetchInterval: 60000,
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
      case "bullish": return "bg-green-500/20 text-green-600 border-green-200";
      case "bearish": return "bg-red-500/20 text-red-600 border-red-200";
      default: return "bg-yellow-500/20 text-yellow-600 border-yellow-200";
    }
  };

  const getNewsCategory = (source: string) => {
    const cryptoSources = ['Cointelegraph', 'CoinDesk', 'Crypto.News', 'Bitcoinist', 'Decrypt'];
    const financialSources = ['CNBC Business', 'Reuters Business', 'WSJ Markets', 'Bloomberg Markets'];
    const geopoliticalSources = ['Reuters World', 'BBC World', 'Al Jazeera'];
    const stockSources = ['Economic Times Markets', 'Business Standard', 'Investing.com Stocks', 'MarketWatch'];
    
    if (cryptoSources.includes(source)) return 'crypto';
    if (financialSources.includes(source)) return 'financial';
    if (geopoliticalSources.includes(source)) return 'geopolitical';
    if (stockSources.includes(source)) return 'stocks';
    return 'general';
  };

  const filteredArticles = articles.filter((article: any) => {
    // Search filter
    if (searchTerm && !article.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !article.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Sentiment filter
    if (sentimentFilter !== "all") {
      if (sentimentFilter === "bullish" && article.sentiment?.toLowerCase() !== "bullish") return false;
      if (sentimentFilter === "bearish" && article.sentiment?.toLowerCase() !== "bearish") return false;
      if (sentimentFilter === "neutral" && article.sentiment?.toLowerCase() !== "neutral") return false;
    }

    // Category filter
    if (categoryFilter !== "all") {
      const articleCategory = getNewsCategory(article.source);
      if (categoryFilter !== articleCategory) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">News Center</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <NewPageLayout>
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">News Analysis Center</h1>
            <Button variant="outline" size="sm" className="ml-auto">
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <p className="text-muted-foreground">AI-powered market news monitoring and analysis</p>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sentiments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="bullish">Bullish</SelectItem>
                  <SelectItem value="bearish">Bearish</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="geopolitical">Geopolitical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredArticles.length} articles
            </div>
          </CardContent>
        </Card>

      {/* Articles */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Newspaper className="h-16 w-16 mx-auto mb-6 opacity-30" />
                <h3 className="text-xl font-semibold mb-2">No news articles found</h3>
                <p className="text-sm text-muted-foreground">
                  News articles will appear here as they are monitored
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredArticles.map((article: any) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getSentimentEmoji(article.sentiment)}</div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold leading-tight pr-4">
                        {article.title}
                      </h3>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getSentimentColor(article.sentiment)}>
                          {article.sentiment || 'Neutral'}
                        </Badge>
                        {article.deepAnalysis && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                            🧠 AI Analyzed
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {article.description || article.summary}
                    </p>

                    {/* Enhanced Analysis Display */}
                    {article.deepAnalysis && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        {/* Scenario Analysis */}
                        {article.deepAnalysis.scenarioAnalysis && (
                          <div>
                            <h5 className="text-sm font-medium mb-2">Market Impact Scenarios</h5>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-lg font-bold text-green-600">
                                  {Math.round((article.deepAnalysis.scenarioAnalysis.bullish || 0) * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">Bullish</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-red-600">
                                  {Math.round((article.deepAnalysis.scenarioAnalysis.bearish || 0) * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">Bearish</div>
                              </div>
                              <div>
                                <div className="text-lg font-bold text-yellow-600">
                                  {Math.round((article.deepAnalysis.scenarioAnalysis.neutral || 0) * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">Neutral</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Insight */}
                        {article.deepAnalysis.metaReasoning && (
                          <div>
                            <h5 className="text-sm font-medium mb-1">AI Insight</h5>
                            <p className="text-sm text-muted-foreground italic">
                              {article.deepAnalysis.metaReasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">{article.source}</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      {article.url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={article.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Read More
                          </a>
                        </Button>
                      )}
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
    </ProtectedRoute>
  );
}