import React from 'react';
import { DollarSign, TrendingUp, Target } from 'lucide-react';
import EnhancedMetricCard from '../EnhancedMetricCard';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';

interface CoreFinancialMetricsProps {
  landlordId: string;
  portfolioId?: string;
  isFavorited?: (widgetId: string) => boolean;
  onToggleFavorite?: (widgetId: string, widgetData?: any) => void;
}

export const CoreFinancialMetrics: React.FC<CoreFinancialMetricsProps> = ({
  landlordId,
  portfolioId,
  isFavorited,
  onToggleFavorite
}) => {
  const {
    data: enhancedData,
    isLoading: enhancedLoading,
    error: enhancedError
  } = useEnhancedLandlordAnalytics(landlordId, portfolioId);

  const enhancedMetrics = enhancedData?.enhancedMetrics;

  if (enhancedLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (enhancedError) {
    return (
      <div className="p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5">
        <p className="text-destructive">Failed to load core financial metrics</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <EnhancedMetricCard
        title="Monthly Revenue"
        value={enhancedMetrics?.grossMonthlyRevenue || 0}
        formatValue="currency"
        icon={DollarSign}
        trend={{
          value: 12.5,
          isPositive: true,
          percentage: 12.5
        }}
        className="bg-card border-openkey-blue/20 card-hover-gold"
        size="md"
        infoText="Total gross rental income collected from all properties in the current month, including base rent and additional fees."
      />
      
      <EnhancedMetricCard
        title="Net Operating Income"
        value={enhancedMetrics?.netOperatingIncome || 0}
        formatValue="currency"
        icon={TrendingUp}
        trend={{
          value: 8.7,
          isPositive: true,
          percentage: 8.7
        }}
        className="bg-card border-openkey-blue/20 card-hover-gold"
        size="md"
        infoText="Revenue remaining after operating expenses, before debt service. Key indicator of property profitability and investment performance."
      />
      
      <EnhancedMetricCard
        title="Cash Flow"
        value={enhancedMetrics?.cashFlow || 0}
        formatValue="currency"
        icon={DollarSign}
        trend={{
          value: enhancedMetrics?.cashFlow > 0 ? 15.3 : -8.2,
          isPositive: (enhancedMetrics?.cashFlow || 0) > 0,
          percentage: Math.abs(enhancedMetrics?.cashFlow > 0 ? 15.3 : -8.2)
        }}
        className="bg-card border-openkey-blue/20 card-hover-gold"
        size="md"
        infoText="Net cash generated or consumed by the portfolio after all expenses and debt service. Positive cash flow indicates profitability."
      />
      
      <EnhancedMetricCard
        title="Portfolio ROI"
        value={enhancedMetrics?.profitMargin || 0}
        formatValue="percentage"
        icon={Target}
        trend={{
          value: 4.2,
          isPositive: true,
          percentage: 4.2
        }}
        className="bg-card border-openkey-blue/20 card-hover-gold"
        size="md"
        infoText="Return on investment as profit margin percentage. Measures overall portfolio efficiency and investment returns."
      />
    </div>
  );
};