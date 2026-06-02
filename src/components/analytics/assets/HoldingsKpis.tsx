import { Card, CardContent } from '@/components/ui/card';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { type SupportedCurrency } from '@/lib/currencyUtils';
import { Users, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { FavoriteChartWrapper } from '../wrappers/FavoriteChartWrapper';
import type { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface HoldingsKpisProps {
  data: {
    total_assets: number;
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_pl: number;
    total_unrealized_pl_percent: number;
    total_annual_income: number;
  };
  isLoading: boolean;
  currency?: SupportedCurrency;
  isFavorited?: (widgetId: string) => boolean;
  onToggleFavorite?: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete?: (widgetId: string) => void;
  visibleMetrics?: string[]; // Which specific KPI widgets to show
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const HoldingsKpis = ({ data, isLoading, currency = 'USD', isFavorited, onToggleFavorite, onDelete, visibleMetrics, timeframe = 'ytd' }: HoldingsKpisProps) => {
  // Default to showing all metrics if not specified
  const metricsToShow = visibleMetrics || ['asset-count', 'total-portfolio-value', 'portfolio-change-24h', 'portfolio-return'];
  const visibleCount = metricsToShow.length;
  
  const getTimeframeLabel = (tf: string): string => {
    const labels: Record<string, string> = {
      '24h': '24H',
      '7d': '7D',
      '30d': '30D',
      '90d': '3M',
      'ytd': 'YTD',
      '1y': '1Y',
      'all': 'All'
    };
    return labels[tf] || tf.toUpperCase();
  };
  
  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: visibleCount }).map((_, i) => (
          <Card key={i} className="p-6">
            <MetricSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metricsToShow.includes('asset-count') && (
        <FavoriteChartWrapper
        widgetId="asset-count"
        title="Total Assets"
        tab="financial"
        category="assets"
        isFavorited={isFavorited?.('asset-count') || false}
        onToggleFavorite={onToggleFavorite || (() => {})}
        onDelete={onDelete ? () => onDelete('asset-count') : undefined}
        value={data.total_assets}
        iconName="Users"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>Total Assets</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{data.total_assets}</div>
          </CardContent>
        </Card>
      </FavoriteChartWrapper>
      )}

      {metricsToShow.includes('total-portfolio-value') && (
        <FavoriteChartWrapper
        widgetId="total-portfolio-value"
        title="Market Value"
        tab="financial"
        category="assets"
        isFavorited={isFavorited?.('total-portfolio-value') || false}
        onToggleFavorite={onToggleFavorite || (() => {})}
        onDelete={onDelete ? () => onDelete('total-portfolio-value') : undefined}
        value={data.total_market_value}
        iconName="DollarSign"
        formatValue="currency"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span>Market Value</span>
            </div>
            <CurrencyDisplay
              amount={data.total_market_value}
              currency={currency}
              fromCurrency="USD"
              className="text-3xl font-bold text-foreground"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {data.total_unrealized_pl_percent.toFixed(2)}% return ({getTimeframeLabel(timeframe)})
            </div>
          </CardContent>
        </Card>
      </FavoriteChartWrapper>
      )}

      {metricsToShow.includes('portfolio-change-24h') && (
        <FavoriteChartWrapper
        widgetId="portfolio-change-24h"
        title="Cost Basis"
        tab="financial"
        category="assets"
        isFavorited={isFavorited?.('portfolio-change-24h') || false}
        onToggleFavorite={onToggleFavorite || (() => {})}
        onDelete={onDelete ? () => onDelete('portfolio-change-24h') : undefined}
        value={data.total_cost_basis}
        iconName="TrendingUp"
        formatValue="currency"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Cost Basis</span>
            </div>
            <CurrencyDisplay
              amount={data.total_cost_basis}
              currency={currency}
              fromCurrency="USD"
              className="text-3xl font-bold text-foreground"
            />
            <div className="text-xs text-muted-foreground mt-1">
              0.00% return
            </div>
          </CardContent>
        </Card>
      </FavoriteChartWrapper>
      )}

      {metricsToShow.includes('portfolio-return') && (
        <FavoriteChartWrapper
        widgetId="portfolio-return"
        title="Annual Income"
        tab="financial"
        category="assets"
        isFavorited={isFavorited?.('portfolio-return') || false}
        onToggleFavorite={onToggleFavorite || (() => {})}
        onDelete={onDelete ? () => onDelete('portfolio-return') : undefined}
        value={data.total_annual_income}
        iconName="Wallet"
        formatValue="currency"
      >
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Wallet className="h-4 w-4" />
              <span>Annual Income</span>
            </div>
            <CurrencyDisplay
              amount={data.total_annual_income}
              currency={currency}
              fromCurrency="USD"
              className="text-3xl font-bold text-foreground"
            />
            <div className="text-xs text-muted-foreground mt-1">
              0.00% return
            </div>
          </CardContent>
        </Card>
      </FavoriteChartWrapper>
      )}
    </div>
  );
};