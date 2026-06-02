import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const MarketNewsFeed = () => {
  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === 'positive') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (sentiment === 'negative') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };
  
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Market News Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockPortfolioData.marketNews.map((news, index) => (
            <div 
              key={index} 
              className="flex gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <div className="mt-1">
                {getSentimentIcon(news.sentiment)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">{news.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{news.source}</span>
                  <span>•</span>
                  <span>{news.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
