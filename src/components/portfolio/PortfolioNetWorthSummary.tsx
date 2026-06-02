import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Plus, Minus, RefreshCw } from 'lucide-react';
import { usePortfolioAssets } from '@/hooks/usePortfolioAssets';
import { usePortfolioLiabilities } from '@/hooks/usePortfolioLiabilities';
import { formatCurrency } from '@/lib/utils';

interface PortfolioNetWorthSummaryProps {
  portfolioId: string;
  onAddAsset: () => void;
  onAddLiability: () => void;
  onRefresh?: () => void;
}

export const PortfolioNetWorthSummary: React.FC<PortfolioNetWorthSummaryProps> = ({
  portfolioId,
  onAddAsset,
  onAddLiability,
  onRefresh
}) => {
  const { data: assets = [], isLoading: assetsLoading } = usePortfolioAssets(portfolioId);
  const { data: liabilities = [], isLoading: liabilitiesLoading } = usePortfolioLiabilities(portfolioId);

  const totalAssets = assets.reduce((sum, asset) => {
    return sum + (asset.current_value || asset.asset_value);
  }, 0);

  const totalLiabilities = liabilities.reduce((sum, liability) => {
    return sum + liability.current_balance;
  }, 0);

  const netWorth = totalAssets - totalLiabilities;
  const assetToLiabilityRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities) * 100 : 100;

  const monthlyIncome = assets.reduce((sum, asset) => sum + (asset.annual_income / 12), 0);
  const monthlyExpenses = assets.reduce((sum, asset) => sum + (asset.annual_expenses / 12), 0);
  const monthlyLiabilityPayments = liabilities.reduce((sum, liability) => {
    return sum + (liability.monthly_payment || 0);
  }, 0);

  const netMonthlyCashFlow = monthlyIncome - monthlyExpenses - monthlyLiabilityPayments;

  const isLoading = assetsLoading || liabilitiesLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Net Worth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(netWorth)}</div>
                <div className="flex items-center text-sm text-muted-foreground">
                  {netWorth >= 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1 text-destructive" />
                  )}
                  Assets - Liabilities
                </div>
              </div>
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-success">{formatCurrency(totalAssets)}</div>
                <div className="text-sm text-muted-foreground">{assets.length} assets</div>
              </div>
              <Button variant="outline" size="sm" onClick={onAddAsset}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalLiabilities)}</div>
                <div className="text-sm text-muted-foreground">{liabilities.length} liabilities</div>
              </div>
              <Button variant="outline" size="sm" onClick={onAddLiability}>
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className={`text-2xl font-bold ${netMonthlyCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(netMonthlyCashFlow)}
              </div>
              <div className="text-sm text-muted-foreground">
                Income - Expenses - Debt Payments
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset to Liability Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset to Liability Ratio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Leverage Health</span>
              <span className={assetToLiabilityRatio >= 100 ? 'text-success' : 'text-warning'}>
                {assetToLiabilityRatio.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(assetToLiabilityRatio, 200)} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {assetToLiabilityRatio >= 150 ? 'Excellent' : 
               assetToLiabilityRatio >= 100 ? 'Good' : 
               assetToLiabilityRatio >= 50 ? 'Needs Improvement' : 'High Risk'}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Cash Flow Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Income</span>
              <span className="text-success font-medium">+{formatCurrency(monthlyIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Asset Expenses</span>
              <span className="text-warning font-medium">-{formatCurrency(monthlyExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Debt Payments</span>
              <span className="text-destructive font-medium">-{formatCurrency(monthlyLiabilityPayments)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium">
                <span>Net Cash Flow</span>
                <span className={netMonthlyCashFlow >= 0 ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(netMonthlyCashFlow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};