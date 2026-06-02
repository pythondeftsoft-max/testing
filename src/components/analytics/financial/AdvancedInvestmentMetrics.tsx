import React from 'react';
import { Target, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import EnhancedMetricCard from '../EnhancedMetricCard';
import ROISpeedometerChart from '../charts/ROISpeedometerChart';
import MarketPositionRadarChart from '../charts/MarketPositionRadarChart';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';

interface AdvancedInvestmentMetricsProps {
  landlordId: string;
  portfolioId?: string;
  isFavorited?: (widgetId: string) => boolean;
  onToggleFavorite?: (widgetId: string, widgetData?: any) => void;
}

export const AdvancedInvestmentMetrics: React.FC<AdvancedInvestmentMetricsProps> = ({
  landlordId,
  portfolioId,
  isFavorited,
  onToggleFavorite
}) => {
  const {
    data: modernFinancials,
    isLoading: modernLoading,
    error: modernError
  } = useModernPropertyAnalytics(landlordId, portfolioId);

  const {
    data: enhancedData,
    isLoading: enhancedLoading,
    error: enhancedError
  } = useEnhancedLandlordAnalytics(landlordId, portfolioId);

  const enhancedMetrics = enhancedData?.enhancedMetrics;

  if (modernLoading || enhancedLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-80 bg-muted/20 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (modernError || enhancedError) {
    return (
      <div className="p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5">
        <p className="text-destructive">Failed to load advanced investment metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedMetricCard
          title="Cap Rate"
          value={modernFinancials?.modernFinancialMetrics?.capRate || 0}
          formatValue="percentage"
          icon={Target}
          trend={{
            value: 0.8,
            isPositive: true,
            percentage: 0.8
          }}
          className="bg-card border-openkey-blue/20 card-hover-gold"
          size="md"
          infoText="Capitalization rate - measures annual return on investment without considering financing."
        />
        
        <EnhancedMetricCard
          title="Cash-on-Cash Return"
          value={modernFinancials?.modernFinancialMetrics?.cashOnCashReturn || 0}
          formatValue="percentage"
          icon={DollarSign}
          trend={{
            value: 1.2,
            isPositive: true,
            percentage: 1.2
          }}
          className="bg-card border-openkey-blue/20 card-hover-gold"
          size="md"
          infoText="Cash return relative to cash invested, accounting for financing and leverage effects."
        />
        
        <EnhancedMetricCard
          title="DSCR"
          value={1.25}
          formatValue="number"
          icon={TrendingUp}
          trend={{
            value: 0.3,
            isPositive: true,
            percentage: 12.5
          }}
          className="bg-card border-openkey-blue/20 card-hover-gold"
          size="md"
          infoText="Debt Service Coverage Ratio - measures ability to service debt payments. Values above 1.25 are generally preferred."
          subtitle="ratio"
        />
        
        <EnhancedMetricCard
          title="Expense Ratio"
          value={45}
          formatValue="percentage"
          icon={AlertTriangle}
          trend={{
            value: -2.1,
            isPositive: true,
            percentage: 2.1
          }}
          className="bg-card border-openkey-blue/20 card-hover-gold"
          size="md"
          infoText="Operating expenses as percentage of gross income. Lower ratios indicate more efficient operations."
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Speedometer */}
        <ROISpeedometerChart
          value={modernFinancials?.modernFinancialMetrics?.capRate || 8.5}
          title="Portfolio ROI"
          maxValue={15}
        />

        {/* Market Position Radar */}
        <MarketPositionRadarChart
          data={[
            { subject: 'Occupancy', portfolio: enhancedMetrics?.occupancyRate || 87, market: 85, competitor: 90, fullMark: 100 },
            { subject: 'Rent Competitiveness', portfolio: 78, market: 80, competitor: 88, fullMark: 100 },
            { subject: 'Tenant Satisfaction', portfolio: 85, market: 85, competitor: 87, fullMark: 100 },
            { subject: 'Maintenance Efficiency', portfolio: 92, market: 75, competitor: 82, fullMark: 100 },
            { subject: 'Financial Performance', portfolio: 88, market: 85, competitor: 91, fullMark: 100 },
            { subject: 'Market Share', portfolio: 65, market: 20, competitor: 25, fullMark: 100 }
          ]}
          height={350}
        />
      </div>
    </div>
  );
};