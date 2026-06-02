import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useUnifiedPortfolioMetrics } from '@/hooks/useUnifiedPortfolioMetrics';

interface TotalCashFlowCardProps {
  landlordId: string;
  portfolioId?: string;
  userId?: string;
}

export const TotalCashFlowCard = ({ landlordId, portfolioId, userId }: TotalCashFlowCardProps) => {
  const { data: metrics, isLoading } = useUnifiedPortfolioMetrics(landlordId, portfolioId, userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total Monthly Cash Flow
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

  const isPositive = metrics.netMonthlyCashFlow >= 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Total Monthly Cash Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className={`text-3xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            <CurrencyDisplay amount={metrics.netMonthlyCashFlow} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">Net Monthly Flow</span>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Income</span>
            <span className="font-medium text-success"><CurrencyDisplay amount={metrics.totalMonthlyIncome} /></span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="font-medium text-destructive"><CurrencyDisplay amount={metrics.totalMonthlyExpenses} /></span>
          </div>
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Property Income</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.propertyIncome} /></span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asset Income</span>
            <span className="font-medium"><CurrencyDisplay amount={metrics.assetIncome} /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
