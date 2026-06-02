import React from 'react';
import { Building2, TrendingUp, Users, RefreshCw, Clock } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { OperationalWidgetWrapper } from '@/components/analytics/wrappers/OperationalWidgetWrapper';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface LeasingTenantPerformanceSectionProps {
  portfolioId: string;
  currentUserId: string;
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate: (widgetId: string) => void;
  isVisible: (widgetId: string) => boolean;
}

export const LeasingTenantPerformanceSection: React.FC<LeasingTenantPerformanceSectionProps> = ({
  portfolioId,
  currentUserId,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  isVisible
}) => {
  const { data: propertyData, isLoading } = useModernPropertyAnalytics(currentUserId, portfolioId);

  const { operationalExcellence } = propertyData || {
    operationalExcellence: {
      daysToFillVacancy: 0,
      leasingVelocity: 0,
      applicationToLeaseRatio: 0,
      tenantRetentionRate: 0,
      renewalRate: 0,
      tenantSatisfactionScore: 0,
      complaintResolutionTime: 0,
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const widgets = [
    // Core Metrics
    { id: 'days-to-fill-vacancy', title: 'Days to Fill Vacancy', value: operationalExcellence.daysToFillVacancy, formatValue: 'number' as const, icon: Building2, subtitle: 'average days' },
    { id: 'leasing-velocity', title: 'Leasing Velocity', value: operationalExcellence.leasingVelocity, formatValue: 'number' as const, icon: TrendingUp, subtitle: 'units/month' },
    { id: 'application-to-lease-ratio', title: 'Application to Lease Ratio', value: operationalExcellence.applicationToLeaseRatio, formatValue: 'percentage' as const, icon: Users },
    { id: 'tenant-retention-rate', title: 'Tenant Retention Rate', value: operationalExcellence.tenantRetentionRate, formatValue: 'percentage' as const, icon: Users },
    { id: 'renewal-rate', title: 'Renewal Rate', value: operationalExcellence.renewalRate, formatValue: 'percentage' as const, icon: RefreshCw },
    { id: 'tour-to-lease-ratio', title: 'Tour to Lease Ratio', value: 42, formatValue: 'percentage' as const, icon: Users, subtitle: 'conversion rate' },
    { id: 'lead-response-time', title: 'Lead Response Time', value: 2.3, formatValue: 'number' as const, icon: Clock, subtitle: 'hours avg' },
    { id: 'average-lease-term', title: 'Average Lease Term', value: 12.5, formatValue: 'number' as const, icon: Building2, subtitle: 'months' },
    { id: 'lease-concession-rate', title: 'Lease Concession Rate', value: 15, formatValue: 'percentage' as const, icon: TrendingUp },
    { id: 'showing-activity-rate', title: 'Showing Activity Rate', value: 3.2, formatValue: 'number' as const, icon: Users, subtitle: 'showings/unit' },
    
    // Charts & Trends (showing as metrics for now)
    { id: 'vacancy-trends', title: 'Vacancy Trends', value: operationalExcellence.renewalRate, formatValue: 'percentage' as const, icon: TrendingUp },
    { id: 'renewal-rate-trends', title: 'Renewal Rate Trends', value: operationalExcellence.renewalRate, formatValue: 'percentage' as const, icon: RefreshCw },
    { id: 'leasing-pipeline', title: 'Leasing Pipeline', value: 23, formatValue: 'number' as const, icon: Users, subtitle: 'active leads' },
    { id: 'lease-expiration-timeline', title: 'Lease Expirations (90d)', value: 8, formatValue: 'number' as const, icon: Clock, subtitle: 'upcoming' },
    { id: 'tenant-turnover-trends', title: 'Tenant Turnover Rate', value: 22, formatValue: 'percentage' as const, icon: RefreshCw },
    { id: 'application-volume-trends', title: 'Application Volume', value: 45, formatValue: 'number' as const, icon: Users, subtitle: 'this month' },
    { id: 'showing-activity-trends', title: 'Property Showings', value: 67, formatValue: 'number' as const, icon: Building2, subtitle: 'this month' },
    { id: 'move-in-move-out-calendar', title: 'Scheduled Move-Outs', value: 5, formatValue: 'number' as const, icon: Clock, subtitle: 'next 30 days' },
    
    // Analysis Tools
    { id: 'tenant-satisfaction-score', title: 'Tenant Satisfaction', value: operationalExcellence.tenantSatisfactionScore, formatValue: 'number' as const, icon: Users, subtitle: 'score (1-5)' },
    { id: 'complaint-resolution-time', title: 'Complaint Resolution Time', value: operationalExcellence.complaintResolutionTime, formatValue: 'number' as const, icon: Clock, subtitle: 'hours avg' },
    { id: 'leasing-performance-scorecard', title: 'Leasing Team Score', value: 88, formatValue: 'number' as const, icon: TrendingUp, subtitle: 'out of 100' },
    { id: 'tenant-screening-analysis', title: 'Screening Approval Rate', value: 68, formatValue: 'percentage' as const, icon: Users },
    { id: 'renewal-optimization-insights', title: 'Renewal Opportunity Score', value: 72, formatValue: 'number' as const, icon: RefreshCw, subtitle: 'optimization score' },
    { id: 'lease-pricing-analyzer', title: 'Pricing Competitiveness', value: 85, formatValue: 'number' as const, icon: TrendingUp, subtitle: 'market score' },
    { id: 'tenant-demographic-analysis', title: 'Tenant Diversity Index', value: 78, formatValue: 'number' as const, icon: Users, subtitle: 'diversity score' },
    
    // Comparative Analysis
    { id: 'property-leasing-comparison', title: 'Top Performing Property', value: 94, formatValue: 'number' as const, icon: Building2, subtitle: 'leasing score' },
    { id: 'market-vacancy-benchmarks', title: 'vs Market Vacancy', value: -2.5, formatValue: 'percentage' as const, icon: TrendingUp, subtitle: 'better' },
    { id: 'retention-rate-benchmarks', title: 'vs Industry Retention', value: 3.2, formatValue: 'percentage' as const, icon: RefreshCw, subtitle: 'above avg' },
    { id: 'lease-term-comparison', title: 'Avg Lease vs Market', value: 0.5, formatValue: 'number' as const, icon: Clock, subtitle: 'months longer' },
    { id: 'concession-strategy-comparison', title: 'Concession Effectiveness', value: 82, formatValue: 'number' as const, icon: TrendingUp, subtitle: 'ROI score' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {widgets.filter(widget => isVisible(widget.id)).map(widget => (
        <OperationalWidgetWrapper
          key={widget.id}
          widgetId={widget.id}
          title={widget.title}
          tab="operational"
          category="leasing"
          isFavorited={isFavorited(widget.id)}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          value={widget.value}
          subtitle={widget.subtitle}
          iconName={undefined}
          formatValue={widget.formatValue}
          componentType="metric"
        >
          <ModernMetricCard
            title={widget.title}
            value={widget.value}
            formatValue={widget.formatValue}
            icon={widget.icon}
            subtitle={widget.subtitle}
          />
        </OperationalWidgetWrapper>
      ))}
    </div>
  );
};