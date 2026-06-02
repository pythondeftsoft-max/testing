import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { Target } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { Progress } from "@/components/ui/progress";

interface PortfolioDiversityScoreCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const PortfolioDiversityScoreCard = ({ landlordId, portfolioId, userId }: PortfolioDiversityScoreCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Diversity</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  const getBadgeColor = (rating: string) => {
    switch (rating) {
      case 'diversified':
        return 'text-success';
      case 'moderate':
        return 'text-warning';
      case 'concentrated':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeText = (rating: string) => {
    switch (rating) {
      case 'diversified':
        return 'Well Diversified';
      case 'moderate':
        return 'Moderately Diversified';
      case 'concentrated':
        return 'Concentrated';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Portfolio Diversity</CardTitle>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metrics.diversityScore.toFixed(0)}/100</div>
        <p className={`text-xs font-medium mt-1 ${getBadgeColor(metrics.diversityRating)}`}>
          {getBadgeText(metrics.diversityRating)}
        </p>
        <div className="mt-3">
          <Progress value={metrics.diversityScore} className="h-2" />
        </div>
        {metrics.diversityRating === 'concentrated' && (
          <p className="text-xs text-muted-foreground mt-2">
            Consider diversifying across more asset categories
          </p>
        )}
      </CardContent>
    </Card>
  );
};
