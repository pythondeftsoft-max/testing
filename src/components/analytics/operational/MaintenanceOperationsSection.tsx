import React from 'react';
import { Settings, Clock, CheckCircle, Wrench } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { OperationalWidgetWrapper } from '@/components/analytics/wrappers/OperationalWidgetWrapper';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface MaintenanceOperationsSectionProps {
  portfolioId: string;
  currentUserId: string;
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate: (widgetId: string) => void;
  isVisible: (widgetId: string) => boolean;
}

export const MaintenanceOperationsSection: React.FC<MaintenanceOperationsSectionProps> = ({
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
      maintenanceResponseTime: 0,
      firstCallResolutionRate: 0,
      preventiveMaintenanceRatio: 0,
      complaintResolutionTime: 0,
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const widgets = [
    { id: 'maintenance-response-time', title: 'Response Time', value: operationalExcellence.maintenanceResponseTime, formatValue: 'number' as const, icon: Clock, subtitle: 'hours avg' },
    { id: 'first-call-resolution', title: 'First Call Resolution', value: operationalExcellence.firstCallResolutionRate, formatValue: 'percentage' as const, icon: CheckCircle },
    { id: 'preventive-maintenance', title: 'Preventive Maintenance', value: operationalExcellence.preventiveMaintenanceRatio, formatValue: 'percentage' as const, icon: Wrench },
    { id: 'complaint-resolution-time-maintenance', title: 'Complaint Resolution Time', value: operationalExcellence.complaintResolutionTime, formatValue: 'number' as const, icon: Clock, subtitle: 'hours avg' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {widgets.filter(widget => isVisible(widget.id)).map(widget => (
        <OperationalWidgetWrapper
          key={widget.id}
          widgetId={widget.id}
          title={widget.title}
          tab="operational"
          category="maintenance"
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