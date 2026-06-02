import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface NetMonthlyCashFlowCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const NetMonthlyCashFlowCard = ({ landlordId, portfolioId, userId }: NetMonthlyCashFlowCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Monthly Cash Flow</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  const isPositive = metrics.netMonthlyCashFlow >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Net Monthly Cash Flow</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <CurrencyDisplay amount={metrics.netMonthlyCashFlow} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Income: <CurrencyDisplay amount={metrics.totalMonthlyIncome} /> • Expenses: <CurrencyDisplay amount={metrics.totalMonthlyExpenses} />
        </p>
      </CardContent>
    </Card>
  );
};
