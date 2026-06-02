import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { mockPortfolioData } from '@/utils/mockAssetData';

export const DiversificationScoreWidget = () => {
  const score = mockPortfolioData.diversificationScore;
  const getScoreColor = () => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreLabel = () => {
    if (score >= 70) return 'Well Diversified';
    if (score >= 50) return 'Moderately Diversified';
    return 'Poorly Diversified';
  };
  
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Diversification Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-3xl font-bold ${getScoreColor()}`}>
            {score}/100
          </div>
          <Progress value={score} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {getScoreLabel()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
