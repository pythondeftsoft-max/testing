import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedPortfolioMetrics } from "@/hooks/useUnifiedPortfolioMetrics";
import { CalendarDays } from "lucide-react";
import { MetricSkeleton } from "@/components/ui/metric-skeleton";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface AnnualProjectedIncomeCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const AnnualProjectedIncomeCard = ({ landlordId, portfolioId, userId }: AnnualProjectedIncomeCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annual Projected Income</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <MetricSkeleton />
        </CardContent>
      </Card>
    );
  }

  const annualIncome = metrics.totalMonthlyIncome * 12;
  const monthlyAverage = metrics.totalMonthlyIncome;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Annual Projected Income</CardTitle>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold"><CurrencyDisplay amount={annualIncome} /></div>
        <p className="text-xs text-muted-foreground mt-1">
          <CurrencyDisplay amount={monthlyAverage} />/month average
        </p>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">From Properties</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.propertyIncome * 12} /></span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">From Assets</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.assetIncome * 12} /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
