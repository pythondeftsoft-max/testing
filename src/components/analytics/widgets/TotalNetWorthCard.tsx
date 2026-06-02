import { TrendingUp, Home, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useUnifiedPortfolioMetrics } from '@/hooks/useUnifiedPortfolioMetrics';

interface TotalNetWorthCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const TotalNetWorthCard = ({ landlordId, portfolioId, userId }: TotalNetWorthCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Total Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const growthTrend = metrics.overallROI > 0 ? 'up' : 'down';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" />
          Total Net Worth
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-bold text-foreground">
            <CurrencyDisplay amount={metrics.totalNetWorth} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {growthTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={growthTrend === 'up' ? 'text-success' : 'text-destructive'}>
              {metrics.overallROI.toFixed(2)}% ROI
            </span>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Properties</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.totalPropertyValue} /></span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Financial Assets</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.totalAssetValue} /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
