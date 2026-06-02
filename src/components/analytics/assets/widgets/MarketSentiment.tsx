import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const MarketSentiment = () => {
  const sentiment = mockPortfolioData.marketSentiment;
  
  const getSentimentColor = () => {
    if (sentiment.score >= 75) return 'text-red-600';
    if (sentiment.score >= 55) return 'text-yellow-600';
    if (sentiment.score >= 45) return 'text-gray-600';
    if (sentiment.score >= 25) return 'text-blue-600';
    return 'text-green-600';
  };
  
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Market Sentiment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className={`text-3xl font-bold ${getSentimentColor()}`}>
            {sentiment.score}/100
          </div>
          <Progress value={sentiment.score} className="h-2" />
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{sentiment.label}</div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              +{sentiment.change}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {sentiment.description}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
