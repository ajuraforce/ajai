import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  ExternalLink, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Filter,
  RefreshCw,
  Newspaper 
} from 'lucide-react';
import { useNotificationHelpers } from '@/components/ui/notification-system';
import { PageLayout } from "@/components/ui/main-navigation";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: string;
  sentimentScore: number;
  relevanceScore: number;
  aiAnalysis?: any;
  isDeepAnalyzed: boolean;
  createdAt: string;
}

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const { success, error } = useNotificationHelpers();

  // Fetch news articles
  const { data: newsResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/news', { search: searchQuery, sentiment: sentimentFilter, source: sourceFilter }],
    select: (data) => data || []
  });

  const filteredNews = newsResponse?.filter((article: NewsArticle) => {
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSentiment = sentimentFilter === 'all' || 
      article.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
    
    const matchesSource = sourceFilter === 'all' || 
      article.source?.toLowerCase().includes(sourceFilter.toLowerCase());
    
    return matchesSearch && matchesSentiment && matchesSource;
  }) || [];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return 'text-green-500 bg-green-50 border-green-200';
      case 'bearish': return 'text-red-500 bg-red-50 border-red-200';
      case 'neutral': return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish': return <TrendingUp className="h-3 w-3" />;
      case 'bearish': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const handleRefresh = () => {
    refetch();
    success('News feed refreshed');
  };

  const getUniqueValues = (key: keyof NewsArticle) => {
    const values = newsResponse?.map((article: NewsArticle) => article[key]).filter(Boolean) || [];
    return [...new Set(values)];
  };

  return (
    <PageLayout>
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Newspaper className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">News Analysis Center</h1>
              <p className="text-muted-foreground">AI-powered market news monitoring and analysis</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-news">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-news"
                />
              </div>
              
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger data-testid="select-sentiment-filter">
                  <SelectValue placeholder="All Sentiments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="bullish">Bullish</SelectItem>
                  <SelectItem value="bearish">Bearish</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {getUniqueValues('source').map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{filteredNews.length} articles</span>
                {newsResponse && (
                  <Badge variant="outline">
                    {newsResponse.filter((a: NewsArticle) => a.isDeepAnalyzed).length} analyzed
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* News Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading news articles...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No news articles found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search filters' : 'News articles will appear here as they are monitored'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((article: NewsArticle) => (
              <Card key={article.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
                <CardHeader className="flex-none">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {article.source}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      {article.isDeepAnalyzed && (
                        <Badge className="text-xs bg-blue-500">
                          AI Analyzed
                        </Badge>
                      )}
                      <div className="flex items-center space-x-1">
                        <div 
                          className={`w-2 h-2 rounded-full ${getRelevanceColor(article.relevanceScore || 0)}`}
                          title={`Relevance: ${((article.relevanceScore || 0) * 100).toFixed(0)}%`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-base leading-tight line-clamp-3">
                    {article.title}
                  </CardTitle>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                    {article.sentiment && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSentimentColor(article.sentiment)}`}
                      >
                        <span className="flex items-center space-x-1">
                          {getSentimentIcon(article.sentiment)}
                          <span>{article.sentiment}</span>
                        </span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                    {article.summary || 'No summary available.'}
                  </p>
                  
                  {article.aiAnalysis && (
                    <div className="bg-muted p-3 rounded mb-4">
                      <p className="text-xs font-medium mb-1">AI Insights:</p>
                      <p className="text-xs text-muted-foreground">
                        {typeof article.aiAnalysis === 'string' 
                          ? article.aiAnalysis 
                          : 'Advanced analysis available'
                        }
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      {article.sentimentScore !== undefined && (
                        <span className="text-muted-foreground">
                          Score: {(article.sentimentScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => window.open(article.url, '_blank')}
                      data-testid={`button-read-article-${article.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Read Full
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}