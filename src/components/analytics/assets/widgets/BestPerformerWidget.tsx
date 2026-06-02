import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatInternationalCurrency } from '@/lib/currencyUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { mockPortfolioData } from '@/utils/mockAssetData';

interface BestPerformerWidgetProps {
  currency?: SupportedCurrency;
}

export const BestPerformerWidget = ({ currency = 'USD' }: BestPerformerWidgetProps) => {
  const performer = mockPortfolioData.bestPerformer;
  
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Best Performer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-xl font-bold">{performer.symbol}</div>
          <div className="text-sm text-muted-foreground">{performer.name}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              +{performer.change}%
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatInternationalCurrency(performer.value, currency)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
