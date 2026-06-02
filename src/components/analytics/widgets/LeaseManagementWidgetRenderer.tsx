import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Target,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantWidgetState } from '@/hooks/useTenantWidgetState';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import { WidgetActionsMenu } from '@/components/analytics/WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import ModernAnalyticsCard from '@/components/analytics/ModernAnalyticsCard';
import { RentOptimizationPotential } from './RentOptimizationPotential';
import { LeasePerformanceTimeline } from './LeasePerformanceTimeline';
import { RentTrendsChart } from './RentTrendsChart';
import { LeaseRenewalPipelineChart } from './LeaseRenewalPipelineChart';
import { MarketRentAnalyzerPanel } from '../panels/MarketRentAnalyzerPanel';

interface LeaseManagementWidgetRendererProps {
  landlordId: string;
  portfolioId?: string;
  leaseData: {
    totalLeases: number;
    expiringLeases: number;
    optimizationPotential: number;
    renewalRate: number;
    averageLeaseLength: number;
    currentAverageRent: number;
    rentIncreaseOpportunities: number;
  };
  loading?: boolean;
}

export const LeaseManagementWidgetRenderer: React.FC<LeaseManagementWidgetRendererProps> = ({
  landlordId,
  portfolioId,
  leaseData,
  loading = false
}) => {
  // Widget management hooks
  const {
    isWidgetVisible,
    deleteWidget,
    regenerateWidget,
    getRegenerationCount
  } = useTenantWidgetState(landlordId);
  
  const {
    isFavorited,
    toggleFavorite
  } = useWidgetFavorites(landlordId);

  // Widget rendering helper for metrics
  const renderMetricWidget = (
    widgetId: string, 
    title: string, 
    value: string | number, 
    description: string,
    icon: any,
    formatValue?: 'currency' | 'percentage' | 'number'
  ) => {
    if (!isWidgetVisible(widgetId)) return null;
    
    const regenerationKey = getRegenerationCount(widgetId);

    const handleToggleFavorite = () => {
      const widgetData: FavoriteWidget = {
        id: widgetId,
        tab: 'tenants',
        category: 'lease-rent-optimization',
        title,
        componentType: 'metric',
        widgetProps: {
          value,
          subtitle: description,
          icon: icon.name,
          iconColor: 'text-primary',
          formatValue: formatValue || 'number',
        }
      };
      toggleFavorite(widgetId, widgetData);
    };

    const handleDelete = () => {
      deleteWidget(widgetId);
    };

    const handleRegenerate = () => {
      regenerateWidget(widgetId);
    };
    
    return (
      <div key={`${widgetId}-${regenerationKey}`} className="group relative">
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited(widgetId)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
          />
        </div>
        
        <ModernAnalyticsCard
          title={title}
          value={value}
          icon={icon}
          subtitle={description}
          loading={loading}
          formatValue={formatValue}
          className="animate-fade-in h-[150px]"
        />
      </div>
    );
  };

  // Widget rendering helper for charts/panels
  const renderChartWidget = (
    widgetId: string, 
    title: string, 
    description: string,
    children: React.ReactNode
  ) => {
    if (!isWidgetVisible(widgetId)) return null;
    
    const regenerationKey = getRegenerationCount(widgetId);

    const handleToggleFavorite = () => {
      const widgetData: FavoriteWidget = {
        id: widgetId,
        tab: 'tenants',
        category: 'lease-rent-optimization',
        title,
        componentType: 'chart',
        widgetProps: {
          subtitle: description,
          icon: 'BarChart3',
          iconColor: 'text-primary',
        }
      };
      toggleFavorite(widgetId, widgetData);
    };

    const handleDelete = () => {
      deleteWidget(widgetId);
    };

    const handleRegenerate = () => {
      regenerateWidget(widgetId);
    };
    
    return (
      <div key={`${widgetId}-${regenerationKey}`} className="group relative">
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited(widgetId)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
          />
        </div>
        
        <ModernAnalyticsCard
          title={title}
          value=""
          icon={BarChart3 as any}
          subtitle={description}
          loading={loading}
          chart={children}
          className="animate-fade-in"
        />
      </div>
    );
  };

  // Widget rendering helper for specialized components
  const renderSpecializedWidget = (
    widgetId: string, 
    title: string,
    component: React.ReactNode
  ) => {
    if (!isWidgetVisible(widgetId)) return null;
    
    const regenerationKey = getRegenerationCount(widgetId);

    const handleToggleFavorite = () => {
      const widgetData: FavoriteWidget = {
        id: widgetId,
        tab: 'tenants',
        category: 'lease-rent-optimization',
        title,
        componentType: 'panel',
        widgetProps: {
          subtitle: '',
          icon: 'BarChart3',
          iconColor: 'text-primary',
        }
      };
      toggleFavorite(widgetId, widgetData);
    };

    const handleDelete = () => {
      deleteWidget(widgetId);
    };

    const handleRegenerate = () => {
      regenerateWidget(widgetId);
    };
    
    return (
      <div key={`${widgetId}-${regenerationKey}`} className="group relative">
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited(widgetId)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
          />
        </div>
        
        <div className="animate-fade-in">
          {component}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Metrics & Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
        <ModernAnalyticsCard
          key={i}
          title=""
          value={0}
          icon={DollarSign as any}
          loading={true}
          className="h-[150px]"
        />
          ))}
        </div>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <ModernAnalyticsCard
              key={`chart-${i}`}
              title=""
              value={0}
              icon={BarChart3 as any}
              loading={true}
              className="h-64"
            />
          ))}
        </div>
      </div>
    );
  }

  // Metric and panel widgets (top grid section)
  const metricAndPanelWidgets = (
    <>
      {renderMetricWidget(
        'renewal-rate',
        'Lease Renewal Rate',
        `${leaseData.renewalRate.toFixed(1)}%`,
        'Percentage of leases that were renewed',
        TrendingUp,
        'percentage'
      )}

      {renderSpecializedWidget(
        'rent-optimization-potential',
        'Rent Optimization',
        <RentOptimizationPotential landlordId={landlordId} portfolioId={portfolioId} />
      )}

      {renderMetricWidget(
        'rent-increase-opportunities',
        'Rent Increases',
        leaseData.rentIncreaseOpportunities,
        'Properties with rent increase potential',
        Target,
        'number'
      )}

      {renderMetricWidget(
        'average-lease-term',
        'Avg Lease Term',
        `${leaseData.averageLeaseLength.toFixed(1)}mo`,
        'Average length of lease agreements',
        Clock,
        'number'
      )}

      {/* Core Metrics Continue */}
      {renderMetricWidget('lease-expiration-tracker', 'Expiring Soon', leaseData.expiringLeases, 'Leases expiring next 90 days', AlertTriangle, 'number')}
      {renderMetricWidget('pricing-strategy', 'Optimization Potential', leaseData.optimizationPotential, 'Monthly rent increase potential', TrendingUp, 'currency')}
      {renderMetricWidget('total-leases', 'Total Leases', leaseData.totalLeases, 'Active lease agreements', Calendar, 'number')}
      {renderMetricWidget('current-average-rent', 'Average Rent', leaseData.currentAverageRent, 'Portfolio avg monthly rent', DollarSign, 'currency')}
      {renderMetricWidget('market-rent-gap', 'Market Gap', Math.round(leaseData.currentAverageRent * 0.08), 'Difference vs market', DollarSign, 'currency')}
      {renderMetricWidget('lease-renewal-success', 'Renewal Success', `${leaseData.renewalRate.toFixed(1)}%`, 'Successful renewals', CheckCircle, 'percentage')}
      {renderMetricWidget('rent-collection-efficiency', 'Collection Rate', '94.5%', 'On-time collections', Target, 'percentage')}
      {renderMetricWidget('lease-compliance-score', 'Compliance', '89%', 'Lease term compliance', CheckCircle, 'percentage')}
    </>
  );

  // Chart widgets (bottom horizontal section)
  const chartWidgets = (
    <>
      {renderSpecializedWidget(
        'market-rent-comparison',
        'Market Rent Comparison',
        <Card className="p-6 h-64">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Market Rent Comparison</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Avg Rent</span>
              <span className="font-medium">${leaseData.currentAverageRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Market Rate</span>
              <span className="font-medium">${(leaseData.currentAverageRent * 1.08).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Variance</span>
              <Badge variant="secondary">+8% below market</Badge>
            </div>
          </div>
        </Card>
      )}

      {renderSpecializedWidget('lease-performance-timeline', 'Lease Performance Timeline', <LeasePerformanceTimeline landlordId={landlordId} portfolioId={portfolioId} />)}
      {renderSpecializedWidget('rent-trends-over-time', 'Rent Trends', <RentTrendsChart />)}
      {renderSpecializedWidget('lease-renewal-pipeline', 'Renewal Pipeline', <LeaseRenewalPipelineChart />)}
      {renderSpecializedWidget('market-rent-analyzer', 'Market Rent Analyzer', <MarketRentAnalyzerPanel />)}
    </>
  );

  // Check if any chart widgets are visible
  const hasVisibleCharts = isWidgetVisible('market-rent-comparison') || 
                          isWidgetVisible('lease-performance-timeline');

  return (
    <div className="space-y-6">
      {/* Metrics & Analysis Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricAndPanelWidgets}
      </div>
      
      {/* Charts Section - Horizontal Layout */}
      {hasVisibleCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartWidgets}
        </div>
      )}
    </div>
  );
};