import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { Scale } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";

interface IncomeExpenseRatioCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const IncomeExpenseRatioCard = ({ landlordId, portfolioId, userId }: IncomeExpenseRatioCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Income/Expense Ratio</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  const ratio = metrics.totalMonthlyExpenses > 0 
    ? metrics.totalMonthlyIncome / metrics.totalMonthlyExpenses 
    : 0;
  
  const isHealthy = ratio >= 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Income/Expense Ratio</CardTitle>
        <Scale className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
          {ratio.toFixed(2)}:1
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {ratio >= 1 
            ? `For every $1 spent, you earn $${ratio.toFixed(2)}`
            : `Expenses exceed income`
          }
        </p>
      </CardContent>
    </Card>
  );
};
