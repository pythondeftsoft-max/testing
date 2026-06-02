import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { Receipt } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { formatCurrency } from "@/lib/formatters";

interface TotalMonthlyExpensesCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const TotalMonthlyExpensesCard = ({ landlordId, portfolioId, userId }: TotalMonthlyExpensesCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Monthly Expenses</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
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
        <CardTitle className="text-sm font-medium">Total Monthly Expenses</CardTitle>
        <Receipt className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(metrics.totalMonthlyExpenses)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Combined expenses from all sources
        </p>
      </CardContent>
    </Card>
  );
};
