import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { Building2, Coins } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";

interface TotalHoldingsCountCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const TotalHoldingsCountCard = ({ landlordId, portfolioId, userId }: TotalHoldingsCountCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
          <div className="flex gap-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Coins className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
        <div className="flex gap-1">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Coins className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metrics.totalHoldingsCount}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {metrics.propertyCount} {metrics.propertyCount === 1 ? 'Property' : 'Properties'} • {metrics.assetCount} {metrics.assetCount === 1 ? 'Asset' : 'Assets'}
        </p>
      </CardContent>
    </Card>
  );
};
