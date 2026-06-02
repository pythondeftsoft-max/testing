import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { TrendingUp } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { formatPercentage } from "@/lib/formatters";

interface AssetROICardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const AssetROICard = ({ landlordId, portfolioId, userId }: AssetROICardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Asset ROI</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  const isPositive = metrics.assetROI >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Asset ROI</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {formatPercentage(metrics.assetROI)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Return on financial assets
        </p>
      </CardContent>
    </Card>
  );
};
