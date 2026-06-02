import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { Building } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { formatCurrency } from "@/lib/formatters";

interface TotalPropertyValueCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const TotalPropertyValueCard = ({ landlordId, portfolioId, userId }: TotalPropertyValueCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Property Value</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
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
        <CardTitle className="text-sm font-medium">Total Property Value</CardTitle>
        <Building className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(metrics.totalPropertyValue)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {metrics.propertyCount} {metrics.propertyCount === 1 ? 'Property' : 'Properties'}
        </p>
      </CardContent>
    </Card>
  );
};
