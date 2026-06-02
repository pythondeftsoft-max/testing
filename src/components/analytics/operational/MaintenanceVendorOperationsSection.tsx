import React from 'react';
import { Clock, CheckCircle, Wrench, Users } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { OperationalWidgetWrapper } from '@/components/analytics/wrappers/OperationalWidgetWrapper';
import { MetricDisplay } from '@/components/ui/metric-display';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { getWidgetsForCategory } from '@/utils/widgetCatalog';
// Charts
import { MaintenanceBacklogTrendsChart } from './charts/MaintenanceBacklogTrendsChart';
import { EmergencyVsRoutineChart } from './charts/EmergencyVsRoutineChart';
import { MaintenanceRequestTrendsChart } from './charts/MaintenanceRequestTrendsChart';
import { CategoryBreakdownChart } from './charts/CategoryBreakdownChart';
import { SeasonalMaintenancePatternsChart } from './charts/SeasonalMaintenancePatternsChart';
import { ResponseTimeTrendsChart } from './charts/ResponseTimeTrendsChart';
import { CostVsBudgetAnalysisChart } from './charts/CostVsBudgetAnalysisChart';
import { CompletionRateTrendsChart } from './charts/CompletionRateTrendsChart';
import { VendorPerformanceComparisonChart } from './charts/VendorPerformanceComparisonChart';
import { ServiceRequestTrendsChart } from './charts/ServiceRequestTrendsChart';
import { VendorCostTrendsChart } from './charts/VendorCostTrendsChart';
import { VendorUtilizationChart } from './charts/VendorUtilizationChart';
import { ServiceCategoryBreakdownChart } from './charts/ServiceCategoryBreakdownChart';
// Panels
import { MaintenanceCostAnalysisPanel } from './panels/MaintenanceCostAnalysisPanel';
import { PropertyMaintenanceComparisonPanel } from './panels/PropertyMaintenanceComparisonPanel';
import { PredictiveMaintenanceInsightsPanel } from './panels/PredictiveMaintenanceInsightsPanel';
import { MaintenancePriorityMatrixPanel } from './panels/MaintenancePriorityMatrixPanel';
import { VendorScorecardsPanel } from './panels/VendorScorecardsPanel';
import { VendorContractManagementPanel } from './panels/VendorContractManagementPanel';
import { VendorOptimizationInsightsPanel } from './panels/VendorOptimizationInsightsPanel';

interface MaintenanceVendorOperationsSectionProps {
  portfolioId: string;
  currentUserId: string;
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate: (widgetId: string) => void;
  isVisible: (widgetId: string) => boolean;
}

export const MaintenanceVendorOperationsSection: React.FC<MaintenanceVendorOperationsSectionProps> = ({
  portfolioId,
  currentUserId,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  isVisible
}) => {
  const { data: propertyData, isLoading: propertyLoading } = useModernPropertyAnalytics(currentUserId, portfolioId);
  const { metrics: maintenanceMetrics, isLoading: maintenanceLoading } = useMaintenanceDashboard(
    portfolioId !== 'everything' ? portfolioId : undefined
  );

  const { operationalExcellence } = propertyData || {
    operationalExcellence: {
      maintenanceResponseTime: 0,
      firstCallResolutionRate: 0,
      preventiveMaintenanceRatio: 0,
      complaintResolutionTime: 0,
      vendorPerformanceScore: 0,
    }
  };

  // Get widgets from catalog for both categories
  const maintenanceWidgets = getWidgetsForCategory('maintenance');
  const vendorWidgets = getWidgetsForCategory('vendor-operations');
  const allCatalogWidgets = [...maintenanceWidgets, ...vendorWidgets];

  // Map widget IDs to actual data values and components
  const getWidgetData = (widgetId: string, category: string) => {
    const dataMap: Record<string, any> = {
      // Maintenance Metric widgets
      'maintenance-response-time': { componentType: 'metric', value: operationalExcellence.maintenanceResponseTime, formatValue: 'number', icon: Clock, subtitle: 'hours avg' },
      'first-call-resolution-rate': { componentType: 'metric', value: operationalExcellence.firstCallResolutionRate, formatValue: 'percentage', icon: CheckCircle },
      'preventive-maintenance-ratio': { componentType: 'metric', value: operationalExcellence.preventiveMaintenanceRatio, formatValue: 'percentage', icon: Wrench },
      'complaint-resolution-time-maint': { componentType: 'metric', value: operationalExcellence.complaintResolutionTime, formatValue: 'number', icon: Clock, subtitle: 'hours avg' },
      'maintenance-completion-rate': { componentType: 'metric', value: 89, formatValue: 'percentage', icon: CheckCircle },
      'maintenance-cost-per-unit': { componentType: 'metric', value: 145, formatValue: 'currency', icon: Wrench, subtitle: 'per month' },
      'emergency-response-time': { componentType: 'metric', value: 2.3, formatValue: 'number', icon: Clock, subtitle: 'hours avg' },
      'maintenance-satisfaction-score': { componentType: 'metric', value: 4.5, formatValue: 'number', icon: CheckCircle, subtitle: 'out of 5' },
      'work-order-backlog': { componentType: 'metric', value: 12, formatValue: 'number', icon: Wrench, subtitle: 'pending' },
      'average-repair-cost': { componentType: 'metric', value: 385, formatValue: 'currency', icon: Wrench },
      'maintenance-efficiency-ratio': { componentType: 'metric', value: 92, formatValue: 'percentage', icon: CheckCircle },
      'repeat-request-rate': { componentType: 'metric', value: 8, formatValue: 'percentage', icon: Wrench },
      'work-order-response-time': { componentType: 'metric', value: operationalExcellence.maintenanceResponseTime, formatValue: 'number', icon: Clock, subtitle: 'hours avg' },
      
      // Maintenance Chart widgets
      'maintenance-backlog-trends': { componentType: 'chart', component: MaintenanceBacklogTrendsChart },
      'emergency-vs-routine': { componentType: 'chart', component: EmergencyVsRoutineChart },
      'maintenance-request-trends': { componentType: 'chart', component: MaintenanceRequestTrendsChart },
      'category-breakdown': { componentType: 'chart', component: CategoryBreakdownChart },
      'seasonal-maintenance-patterns': { componentType: 'chart', component: SeasonalMaintenancePatternsChart },
      'response-time-trends': { componentType: 'chart', component: ResponseTimeTrendsChart },
      'cost-vs-budget-analysis': { componentType: 'chart', component: CostVsBudgetAnalysisChart },
      'completion-rate-trends': { componentType: 'chart', component: CompletionRateTrendsChart },
      
      // Maintenance Panel widgets
      'maintenance-cost-analysis': { componentType: 'panel', component: MaintenanceCostAnalysisPanel },
      'property-maintenance-comparison': { componentType: 'panel', component: PropertyMaintenanceComparisonPanel },
      'predictive-maintenance-insights': { componentType: 'panel', component: PredictiveMaintenanceInsightsPanel },
      'maintenance-priority-matrix': { componentType: 'panel', component: MaintenancePriorityMatrixPanel },
      
      // Vendor Metric widgets
      'vendor-performance-score': { componentType: 'metric', value: operationalExcellence.vendorPerformanceScore, formatValue: 'number', icon: Users, subtitle: 'score (1-100)' },
      'service-quality-rating': { componentType: 'metric', value: 4.6, formatValue: 'number', icon: CheckCircle, subtitle: 'out of 5' },
      'vendor-cost-efficiency': { componentType: 'metric', value: 87, formatValue: 'percentage', icon: Users },
      'active-vendors-count': { componentType: 'metric', value: maintenanceMetrics?.active_vendors || 0, formatValue: 'number', icon: Users },
      'vendor-response-time': { componentType: 'metric', value: 3.2, formatValue: 'number', icon: Clock, subtitle: 'hours avg' },
      'vendor-reliability-score': { componentType: 'metric', value: 94, formatValue: 'percentage', icon: CheckCircle },
      'average-job-completion-time': { componentType: 'metric', value: 18, formatValue: 'number', icon: Clock, subtitle: 'hours' },
      'vendor-cost-per-job': { componentType: 'metric', value: 425, formatValue: 'currency', icon: Users },
      'vendor-compliance-rate': { componentType: 'metric', value: 96, formatValue: 'percentage', icon: CheckCircle },
      'contract-renewal-rate': { componentType: 'metric', value: 88, formatValue: 'percentage', icon: Users },
      
      // Vendor Chart widgets
      'vendor-performance-comparison': { componentType: 'chart', component: VendorPerformanceComparisonChart },
      'service-request-trends': { componentType: 'chart', component: ServiceRequestTrendsChart },
      'vendor-cost-trends': { componentType: 'chart', component: VendorCostTrendsChart },
      'vendor-utilization': { componentType: 'chart', component: VendorUtilizationChart },
      'service-category-breakdown': { componentType: 'chart', component: ServiceCategoryBreakdownChart },
      
      // Vendor Panel widgets
      'vendor-scorecards': { componentType: 'panel', component: VendorScorecardsPanel },
      'vendor-contract-management': { componentType: 'panel', component: VendorContractManagementPanel },
      'vendor-optimization-insights': { componentType: 'panel', component: VendorOptimizationInsightsPanel },
    };
    
    return dataMap[widgetId] || { componentType: 'metric', value: 0, formatValue: 'number', icon: Wrench };
  };

  if (propertyLoading || maintenanceLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allCatalogWidgets.slice(0, 8).map((widget) => (
          <div key={widget.id} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {allCatalogWidgets
        .filter(catalogWidget => isVisible(catalogWidget.id))
        .map(catalogWidget => {
          const widgetData = getWidgetData(catalogWidget.id, catalogWidget.category);
          
          // Render metrics
          if (widgetData.componentType === 'metric') {
            return (
              <OperationalWidgetWrapper
                key={catalogWidget.id}
                widgetId={catalogWidget.id}
                title={catalogWidget.name}
                tab="operational"
                category={catalogWidget.category}
                isFavorited={isFavorited(catalogWidget.id)}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDelete}
                onRegenerate={onRegenerate}
                value={widgetData.value}
                subtitle={widgetData.subtitle}
                formatValue={widgetData.formatValue}
                componentType="metric"
              >
                <ModernMetricCard
                  title={catalogWidget.name}
                  value={widgetData.value}
                  formatValue={widgetData.formatValue}
                  icon={widgetData.icon}
                  subtitle={widgetData.subtitle}
                />
              </OperationalWidgetWrapper>
            );
          }
          
          // Render charts and panels (full width)
          if (widgetData.componentType === 'chart' || widgetData.componentType === 'panel') {
            const WidgetComponent = widgetData.component;
            return (
              <div key={catalogWidget.id} className="col-span-full">
                <OperationalWidgetWrapper
                  widgetId={catalogWidget.id}
                  title={catalogWidget.name}
                  tab="operational"
                  category={catalogWidget.category}
                  isFavorited={isFavorited(catalogWidget.id)}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDelete}
                  onRegenerate={onRegenerate}
                  componentType={widgetData.componentType}
                >
                  <WidgetComponent />
                </OperationalWidgetWrapper>
              </div>
            );
          }
          
          return null;
        })}
    </div>
  );
};