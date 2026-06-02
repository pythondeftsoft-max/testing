import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatInternationalCurrency } from '@/lib/currencyUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { mockPortfolioData } from '@/utils/mockAssetData';

interface TotalGainLossWidgetProps {
  currency?: SupportedCurrency;
}

export const TotalGainLossWidget = ({ currency = 'USD' }: TotalGainLossWidgetProps) => {
  const isPositive = mockPortfolioData.totalGainLoss >= 0;
  
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatInternationalCurrency(mockPortfolioData.totalGainLoss, currency)}
            </div>
            <div className={`text-sm flex items-center gap-1 mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{mockPortfolioData.totalGainLossPercent}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
