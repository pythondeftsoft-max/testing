import React from 'react';
import { TrendingUp } from 'lucide-react';
import { CategorySection } from '@/components/analytics/CategorySection';
import { OperationalFiltersPanel } from '@/components/analytics/OperationalFiltersPanel';
import { GenerateMoreWidgetsButton } from '@/components/analytics/GenerateMoreWidgetsButton';
import { LeasingTenantPerformanceSection } from '@/components/analytics/operational/LeasingTenantPerformanceSection';
import { MaintenanceVendorOperationsSection } from '@/components/analytics/operational/MaintenanceVendorOperationsSection';
import { RiskManagementComplianceSection } from '@/components/analytics/operational/RiskManagementComplianceSection';
import { useOperationalFilters, OperationalFilters } from '@/hooks/useOperationalFilters';
import { useOperationalWidgetState } from '@/hooks/useOperationalWidgetState';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Building2, Settings, AlertCircle, Users, Wrench, Shield } from 'lucide-react';

interface OperationalPerformanceDashboardProps {
  portfolioId: string;
  currentUserId: string;
  onBack: () => void;
}

export const OperationalPerformanceDashboard: React.FC<OperationalPerformanceDashboardProps> = ({
  portfolioId,
  currentUserId,
  onBack
}) => {
  const { data: propertyData, isLoading: propertyLoading } = useModernPropertyAnalytics(currentUserId, portfolioId);
  const operationalFilters = useOperationalFilters();
  const operationalWidgetState = useOperationalWidgetState(currentUserId);
  const widgetFavorites = useWidgetFavorites(currentUserId);

  const { operationalExcellence } = propertyData || {
    operationalExcellence: {
      daysToFillVacancy: 0,
      leasingVelocity: 0,
      applicationToLeaseRatio: 0,
      maintenanceResponseTime: 0,
      vendorPerformanceScore: 0,
    }
  };

  // Create auto-apply filter update function that updates appliedFilters directly
  const handleFilterUpdate = <K extends keyof OperationalFilters>(
    key: K,
    value: OperationalFilters[K]
  ) => {
    // Update both pending and applied filters for immediate effect (auto-apply)
    operationalFilters.updatePendingFilter(key, value);
    // Apply filters immediately to bypass manual application
    operationalFilters.applyPendingFilters();
  };

  const handleWidgetSelection = (selectedWidgets: string[], category: string | string[]) => {
    operationalWidgetState.applyWidgetSelection(selectedWidgets, category);
  };

  return (
    <div className="space-y-6">
      {/* Operational Filters Panel */}
      <OperationalFiltersPanel
        filters={operationalFilters.appliedFilters}
        updateFilter={handleFilterUpdate}
        isApplying={operationalFilters.isApplying}
        userId={currentUserId}
        portfolioId={portfolioId}
      />

      {/* Key Performance Metrics Overview */}
      <CategorySection
        title="Key Performance Metrics Overview"
        description="Core operational performance indicators across your portfolio"
        icon={TrendingUp}
        defaultExpanded={true}
        collapsible={false}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricDisplay
            label="Days to Fill Vacancy"
            value={operationalExcellence.daysToFillVacancy}
            isLoading={propertyLoading}
            icon={<Building2 className="h-4 w-4 text-primary" />}
            valueClassName="text-primary"
          />
          <MetricDisplay
            label="Leasing Velocity"
            value={operationalExcellence.leasingVelocity}
            isLoading={propertyLoading}
            icon={<TrendingUp className="h-4 w-4 text-success" />}
            valueClassName="text-success"
          />
          <MetricDisplay
            label="Maintenance Response"
            value={`${operationalExcellence.maintenanceResponseTime}h`}
            isLoading={propertyLoading}
            icon={<Settings className="h-4 w-4 text-warning" />}
            valueClassName="text-warning"
          />
          <MetricDisplay
            label="Vendor Performance"
            value={operationalExcellence.vendorPerformanceScore}
            isLoading={propertyLoading}
            icon={<Users className="h-4 w-4 text-info" />}
            valueClassName="text-info"
          />
        </div>
      </CategorySection>

      {/* Leasing & Tenant Performance */}
      <CategorySection
        title="Leasing & Tenant Performance"
        description="Track vacancy management, leasing efficiency, tenant satisfaction and retention"
        icon={Building2}
        badge={{ text: 'Leasing & Tenants', variant: 'secondary' }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="leasing" 
            onApplySelection={(widgets) => handleWidgetSelection(widgets, 'leasing')}
            currentVisibleWidgets={operationalWidgetState.getVisibleWidgets('leasing')}
          />
        }
        infoText="Monitor tenant acquisition, retention, satisfaction, and leasing performance"
        isLoading={propertyLoading}
      >
        <LeasingTenantPerformanceSection
          portfolioId={portfolioId}
          currentUserId={currentUserId}
          isFavorited={widgetFavorites.isFavorited}
          onToggleFavorite={widgetFavorites.toggleFavorite}
          onDelete={operationalWidgetState.deleteWidget}
          onRegenerate={operationalWidgetState.regenerateWidget}
          isVisible={operationalWidgetState.isWidgetVisible}
        />
      </CategorySection>

      {/* Maintenance & Vendor Operations */}
      <CategorySection
        title="Maintenance & Vendor Operations"
        description="Monitor maintenance efficiency, vendor performance, and operational metrics"
        icon={Wrench}
        badge={{ text: 'Maintenance & Vendors', variant: 'secondary' }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category={['maintenance', 'vendor-operations']}
            onApplySelection={(widgets) => handleWidgetSelection(widgets, ['maintenance', 'vendor-operations'])}
            currentVisibleWidgets={operationalWidgetState.getVisibleWidgets(['maintenance', 'vendor-operations'])}
          />
        }
        infoText="Track maintenance operations, vendor relationships, and service delivery"
        isLoading={propertyLoading}
      >
        <MaintenanceVendorOperationsSection
          portfolioId={portfolioId}
          currentUserId={currentUserId}
          isFavorited={widgetFavorites.isFavorited}
          onToggleFavorite={widgetFavorites.toggleFavorite}
          onDelete={operationalWidgetState.deleteWidget}
          onRegenerate={operationalWidgetState.regenerateWidget}
          isVisible={operationalWidgetState.isWidgetVisible}
        />
      </CategorySection>

      {/* Risk Management & Compliance */}
      <CategorySection
        title="Risk Management & Compliance"
        description="Track safety compliance, incident rates, and insurance claims"
        icon={Shield}
        badge={{ text: 'Risk & Compliance', variant: 'secondary' }}
        defaultExpanded={false}
        headerActions={
          <GenerateMoreWidgetsButton
            category="risk-management"
            onApplySelection={(widgets) => handleWidgetSelection(widgets, 'risk-management')}
            currentVisibleWidgets={operationalWidgetState.getVisibleWidgets('risk-management')}
          />
        }
        infoText="Monitor safety compliance, risk mitigation, and incident management"
        isLoading={propertyLoading}
      >
        <RiskManagementComplianceSection
          portfolioId={portfolioId}
          currentUserId={currentUserId}
          isFavorited={widgetFavorites.isFavorited}
          onToggleFavorite={widgetFavorites.toggleFavorite}
          onDelete={operationalWidgetState.deleteWidget}
          onRegenerate={operationalWidgetState.regenerateWidget}
          isVisible={operationalWidgetState.isWidgetVisible}
        />
      </CategorySection>
    </div>
  );
};