import React from 'react';
import { Users, FileText, Heart, TrendingUp } from 'lucide-react';
import CategorySection from './CategorySection';
import EnhancedTenantLifecycleAnalysis from './tenant/EnhancedTenantLifecycleAnalysis';
import LeaseRentOptimizationDashboard from './tenant/LeaseRentOptimizationDashboard';
import { TenantFiltersPanel } from './TenantFiltersPanel';
import { GenerateMoreWidgetsButton } from './GenerateMoreWidgetsButton';
import { useTenantFilters } from '@/hooks/useTenantFilters';
import { useTenantWidgetState } from '@/hooks/useTenantWidgetState';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';

interface TenantLeaseAnalyticsHubProps {
  landlordId: string;
  portfolioId?: string;
}

const TenantLeaseAnalyticsHub: React.FC<TenantLeaseAnalyticsHubProps> = ({
  landlordId,
  portfolioId
}) => {
  const tenantFilters = useTenantFilters();
  const tenantWidgetState = useTenantWidgetState(landlordId);
  const widgetFavorites = useWidgetFavorites(landlordId);

  // Direct change handlers for auto-apply behavior
  const handleDateRangeChange = (dateRange: { from: Date | undefined; to: Date | undefined }) => {
    tenantFilters.updatePendingFilter('dateRange', dateRange);
    tenantFilters.applyPendingFilters();
  };

  const handlePropertiesChange = (properties: string[]) => {
    tenantFilters.updatePendingFilter('selectedProperties', properties);
    tenantFilters.applyPendingFilters();
  };

  const handlePropertyTypesChange = (types: string[]) => {
    tenantFilters.updatePendingFilter('selectedPropertyTypes', types);
    tenantFilters.applyPendingFilters();
  };

  const handlePortfoliosChange = (portfolios: string[]) => {
    tenantFilters.updatePendingFilter('selectedPortfolios', portfolios);
    tenantFilters.applyPendingFilters();
  };

  // Create auto-apply filter update function that updates appliedFilters directly
  const handleFilterUpdate = <K extends keyof Pick<import('@/hooks/useTenantFilters').TenantFilters, 'selectedProperties' | 'selectedPropertyTypes' | 'selectedPortfolios' | 'dateRange'>>(
    key: K,
    value: import('@/hooks/useTenantFilters').TenantFilters[K]
  ) => {
    // Update both pending and applied filters for immediate effect (auto-apply)
    tenantFilters.updatePendingFilter(key, value);
    // Apply filters immediately to bypass manual application
    tenantFilters.applyPendingFilters();
  };

  // Handle widget selection from the dialog
  const handleWidgetSelection = (category: string, selectedWidgets: string[]) => {
    tenantWidgetState.applyWidgetSelection(category, selectedWidgets);
  };

  return (
    <div className="space-y-6">
      <TenantFiltersPanel
        filters={tenantFilters.appliedFilters}
        onDateRangeChange={handleDateRangeChange}
        onPropertiesChange={handlePropertiesChange}
        onPropertyTypesChange={handlePropertyTypesChange}
        onPortfoliosChange={handlePortfoliosChange}
        onClearFilters={tenantFilters.clearFilters}
        isApplying={tenantFilters.isApplying}
        userId={landlordId}
        portfolioId={portfolioId}
        updateFilter={handleFilterUpdate}
      />
      <CategorySection
        title="Tenant Intelligence Dashboard"
        description="Advanced tenant analytics with lifecycle tracking, satisfaction monitoring, retention insights, and risk assessment"
        icon={Users}
        defaultExpanded={false}
        className="bg-card border-openkey-blue/20"
        headerActions={
          <GenerateMoreWidgetsButton
            category="tenant-lifecycle"
            onApplySelection={(selectedWidgets) => handleWidgetSelection('tenant-lifecycle', selectedWidgets)}
            currentVisibleWidgets={tenantWidgetState.getVisibleWidgets('tenant-lifecycle')}
          />
        }
      >
        <EnhancedTenantLifecycleAnalysis 
          landlordId={landlordId} 
          portfolioId={portfolioId}
        />
      </CategorySection>

      <CategorySection
        title="Lease Management & Rent Optimization"
        description="Comprehensive lease tracking, renewal management, market analysis, and pricing optimization"
        icon={FileText}
        defaultExpanded={false}
        className="bg-card border-openkey-blue/20"
        headerActions={
          <GenerateMoreWidgetsButton
            category="lease-rent-optimization"
            onApplySelection={(selectedWidgets) => handleWidgetSelection('lease-rent-optimization', selectedWidgets)}
            currentVisibleWidgets={tenantWidgetState.getVisibleWidgets('lease-rent-optimization')}
          />
        }
      >
        <LeaseRentOptimizationDashboard 
          landlordId={landlordId} 
          portfolioId={portfolioId}
        />
      </CategorySection>
    </div>
  );
};

export default TenantLeaseAnalyticsHub;