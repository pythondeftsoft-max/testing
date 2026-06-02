import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedPortfolioMetrics } from '@/hooks/useUnifiedPortfolioMetrics';

interface OverallROICardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const OverallROICard = ({ landlordId, portfolioId, userId }: OverallROICardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Portfolio ROI
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

  const roiColor = metrics.overallROI >= 0 ? 'text-success' : 'text-destructive';

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Overall Portfolio ROI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className={`text-3xl font-bold ${roiColor}`}>
            {metrics.overallROI.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className={`h-4 w-4 ${roiColor}`} />
            <span className="text-sm text-muted-foreground">Weighted Average Return</span>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Property ROI</span>
            <span className={`font-medium ${metrics.propertyROI >= 0 ? 'text-success' : 'text-destructive'}`}>
              {metrics.propertyROI.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asset ROI</span>
            <span className={`font-medium ${metrics.assetROI >= 0 ? 'text-success' : 'text-destructive'}`}>
              {metrics.assetROI.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
