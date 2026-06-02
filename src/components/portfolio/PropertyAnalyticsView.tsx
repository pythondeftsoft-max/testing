import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, TrendingUp, DollarSign, Wrench, Users, AlertCircle, Percent, Calendar, Home, Receipt, Star, Settings } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { useAnalyticsNavigation } from '@/hooks/useAnalyticsNavigation';
import { useFilteredPropertyAnalytics } from '@/hooks/useFilteredPropertyAnalytics';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import PropertyFiltersPanel from '@/components/analytics/PropertyFiltersPanel';

import { Skeleton } from '@/components/ui/skeleton';
import { getMetricTooltip } from '@/utils/metricTooltips';
import { supabase } from '@/integrations/supabase/client';
import { PropertyFilterDebugTool } from '@/components/debug/PropertyFilterDebugTool';
import HAPAnalyticsPanel from '@/components/analytics/HAPAnalyticsPanel';

import { normalizePortfolioId } from '@/utils/portfolio';
import { debugLog, isTenantDebugEnabled } from '@/utils/debug';
import { PropertyPerformanceBreakdown } from '@/components/analytics/property/PropertyPerformanceBreakdown';


import { FavoriteChartWrapper } from '@/components/analytics/wrappers/FavoriteChartWrapper';
import { FavoriteAnalyticsWrapper } from '@/components/analytics/wrappers/FavoriteAnalyticsWrapper';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';


interface PropertyAnalyticsViewProps {
  portfolioId: string;
  currentUserId: string;
}

// Helper function to count units like the income statement does
const getUnitCountFromProperties = (properties: any[]) => {
  if (!properties || properties.length === 0) return 0;
  
  return properties.reduce((count, property) => {
    const units = property.property_units || [];
    // If property has units, count them. Otherwise count the property itself as 1 unit
    return count + (units.length > 0 ? units.length : 1);
  }, 0);
};

// Helper function to get all individual units for analytics
const getAllUnitsFromProperties = (properties: any[]) => {
  if (!properties || properties.length === 0) return [];
  
  const allUnits: any[] = [];
  
  properties.forEach(property => {
    const units = property.property_units || [];
    
    if (units.length > 0) {
      // Multi-unit property - add each unit
      units.forEach((unit: any) => {
        allUnits.push({
          id: unit.id,
          propertyId: property.id,
          address: property.address,
          monthly_rent: unit.monthly_rent || 0,
          status: unit.status || property.status || 'available',
          square_feet: unit.square_feet || 0,
          unit_number: unit.unit_number,
          created_at: property.created_at,
          isUnit: true
        });
      });
    } else {
      // Single property - add as single unit
      allUnits.push({
        id: property.id,
        propertyId: property.id,
        address: property.address,
        monthly_rent: property.monthly_rent || 0,
        status: property.status || 'available',
        square_feet: property.square_feet || 0,
        unit_number: null,
        created_at: property.created_at,
        isUnit: false
      });
    }
  });
  
  return allUnits;
};

const PropertyAnalyticsView = ({ portfolioId, currentUserId }: PropertyAnalyticsViewProps) => {
  debugLog('PropertyAnalyticsView', 'Component render', { 
    portfolioId, 
    currentUserId, 
    userIdType: typeof currentUserId 
  });
  
  // Enhanced favoriting system
  const {
    isFavorited,
    toggleFavorite,
    getFavoritesByTab,
    totalFavorites
  } = useWidgetFavorites(currentUserId);

  // Widget favoriting and customization state
  const [showCustomizeMode, setShowCustomizeMode] = useState(false);

  // Widget favoriting helper function
  const createWidgetData = (id: string, tab: string, category: string, title: string, componentType: 'metric' | 'chart' | 'panel' = 'metric', widgetProps?: any) => ({
    id,
    tab: tab as 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants',
    category,
    title,
    componentType,
    widgetProps
  });

  const handleToggleFavorite = (widgetId: string, tab: string, category: string, title: string, componentType: 'metric' | 'chart' | 'panel' = 'metric', widgetProps?: any) => {
    const widgetData = createWidgetData(widgetId, tab, category, title, componentType, widgetProps);
    toggleFavorite(widgetId, widgetData);
  };
  
  const normalizedPortfolioId = normalizePortfolioId(portfolioId);
  const { data, isLoading, error, refetch } = useModernPropertyAnalytics(currentUserId, portfolioId);
  const { navigateToTenantAnalytics, navigateToOperationalPerformance, navigateToFinancialPerformance, navigateToPredictiveAnalytics } = useAnalyticsNavigation();

  // Remove duplicate auth debug state (now handled above)
  
  // Property filtering state and logic
  const {
    filters,
    debouncedFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    isApplying,
    applyFilters,
  } = usePropertyFilters();

  // Get filtered analytics when filters are applied
  const filteredPropertyIds: string[] = [];

  // Debug logging for filter state
  debugLog('PropertyAnalyticsView', 'Filter state', {
    filters,
    debouncedFilters,
    hasActiveFilters,
    isApplying
  });

  // Get analytics for filtered properties
  const {
    data: filteredAnalytics,
    isLoading: filteredLoading,
    error: filteredError
  } = useFilteredPropertyAnalytics(currentUserId, portfolioId, hasActiveFilters ? filteredPropertyIds : undefined);

  // Extract data safely before any conditional returns
  const { modernFinancialMetrics, predictiveAnalytics, operationalExcellence, properties } = data || {
    modernFinancialMetrics: {
      capRate: 0, cashOnCashReturn: 0, debtServiceCoverageRatio: 0, grossRentMultiplier: 0,
      rentGrowthYoY: 0, marketRentVariance: 0, rentRollGrowth: 0,
      operatingExpenseRatio: 0, maintenanceAsPercentOfRevenue: 0, managementFeeRatio: 0, taxBurdenRatio: 0,
      revenuePerSqFt: 0, expensePerSqFt: 0, netIncomePerSqFt: 0, costPerUnit: 0,
      marketAbsorptionRate: 0, competitivePositioning: 0, daysOnMarket: 0,
      tenantConcentrationRisk: 0, incomeVolatility: 0, maintenanceRiskScore: 0
    },
    predictiveAnalytics: {
      vacancyRiskScore: 0, predictedVacancyDays: 0, renewalProbability: 0,
      predictedMaintenanceCosts: 0, deferredMaintenanceRisk: 0, capexRequirements: 0,
      optimalRentPrice: 0, marketRentGap: 0, revenueOptimizationPotential: 0,
      projectedNOI: 0, projectedCashFlow: 0, breakEvenOccupancy: 0
    },
    operationalExcellence: {
      daysToFillVacancy: 0, leasingVelocity: 0, applicationToLeaseRatio: 0,
      maintenanceResponseTime: 0, firstCallResolutionRate: 0, preventiveMaintenanceRatio: 0, vendorPerformanceScore: 0,
      tenantSatisfactionScore: 0, tenantRetentionRate: 0, renewalRate: 0, complaintResolutionTime: 0,
      inspectionComplianceRate: 0, safetyIncidentRate: 0, insuranceClaimFrequency: 0
    },
    properties: []
  };

  // Get all individual units for unit-based analytics
  const allUnits = getAllUnitsFromProperties(properties);
  const totalUnitCount = getUnitCountFromProperties(properties);
  
  // Debug logging for property and unit data
  debugLog('PropertyAnalyticsView', 'Property and unit data', {
    totalProperties: properties.length,
    totalUnits: totalUnitCount,
    propertiesWithUnits: properties.filter(p => p.property_units?.length > 0).length,
    sampleProperty: properties[0] ? {
      id: properties[0].id,
      address: properties[0].address,
      unitCount: properties[0].property_units?.length || 0,
      hasUnits: !!properties[0].property_units?.length
    } : null,
    allUnitsCount: allUnits.length,
    sampleUnits: allUnits.slice(0, 3).map(u => ({
      id: u.id,
      address: u.address,
      monthly_rent: u.monthly_rent,
      status: u.status,
      isUnit: u.isUnit,
      unit_number: u.unit_number
    }))
  });

  // Use filtered analytics when filters are applied, otherwise calculate unit-based analytics
  const unitBasedAnalytics = React.useMemo(() => {
    if (allUnits.length === 0) {
      return {
        totalProperties: 0,
        totalUnits: 0,
        totalRevenue: 0,
        averageRent: 0,
        occupancyRate: 0,
        vacantProperties: 0,
        occupiedProperties: 0,
        maintenanceProperties: 0,
        avgDaysOnMarket: 0,
        totalSquareFeet: 0,
        revenuePerSqFt: 0,
        properties: []
      };
    }

    const totalRevenue = allUnits.reduce((sum, unit) => sum + (unit.monthly_rent || 0) * 12, 0);
    const totalSquareFeet = allUnits.reduce((sum, unit) => sum + (unit.square_feet || 0), 0);
    const occupiedUnits = allUnits.filter(unit => unit.status === 'occupied');
    const vacantUnits = allUnits.filter(unit => unit.status === 'available' || unit.status === 'vacant');
    const maintenanceUnits = allUnits.filter(unit => unit.status === 'maintenance');

    const analytics = {
      totalProperties: properties.length,
      totalUnits: allUnits.length,
      totalRevenue,
      averageRent: allUnits.length > 0 ? allUnits.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0) / allUnits.length : 0,
      occupancyRate: allUnits.length > 0 ? (occupiedUnits.length / allUnits.length) * 100 : 0,
      vacantProperties: vacantUnits.length,
      occupiedProperties: occupiedUnits.length,
      maintenanceProperties: maintenanceUnits.length,
      avgDaysOnMarket: vacantUnits.length > 0 ? vacantUnits
        .filter(unit => unit.created_at)
        .reduce((sum, unit) => sum + Math.max(0, Math.floor((Date.now() - new Date(unit.created_at).getTime()) / (1000 * 60 * 60 * 24))), 0) / vacantUnits.length : 0,
      totalSquareFeet,
      revenuePerSqFt: totalSquareFeet > 0 ? totalRevenue / totalSquareFeet : 0,
      properties: allUnits
    };

    debugLog('PropertyAnalyticsView', 'Unit-based analytics calculated', {
      totalProperties: analytics.totalProperties,
      totalUnits: analytics.totalUnits,
      totalRevenue: analytics.totalRevenue,
      occupancyRate: analytics.occupancyRate,
      occupiedUnits: occupiedUnits.length,
      vacantUnits: vacantUnits.length,
      averageRent: analytics.averageRent
    });

    return analytics;
  }, [allUnits, properties]);

  const analytics = hasActiveFilters ? filteredAnalytics : unitBasedAnalytics;
  const displayProperties = properties || [];

  // Debug logging for analytics selection
  debugLog('PropertyAnalyticsView', 'Analytics selection', {
    hasActiveFilters,
    filteredAnalyticsExists: !!filteredAnalytics,
    analyticsBeingUsed: !!analytics,
    displayPropertiesCount: displayProperties.length,
    analyticsData: analytics ? {
      totalProperties: analytics.totalProperties,
      totalUnits: (analytics as any).totalUnits || 'N/A',
      totalRevenue: analytics.totalRevenue,
      occupancyRate: analytics.occupancyRate
    } : 'No analytics data'
  });

  // Loading state component
  const LoadingView = () => (
    <div className="space-y-6">
      <PropertyFiltersPanel
        selectedPropertyTypes={[]}
        onPropertyTypeChange={() => {}}
        selectedPortfolios={[]}
        onPortfoliosChange={() => {}}
        selectedProperties={[]}
        onPropertiesChange={() => {}}
        dateRange={{ from: undefined, to: undefined }}
        onDateRangeChange={() => {}}
        onClearFilters={() => {}}
        isApplying={false}
        userId={currentUserId}
        portfolioId={portfolioId}
        filters={{
          selectedPropertyTypes: [],
          selectedPortfolios: [],
          selectedProperties: [],
          dateRange: { from: undefined, to: undefined }
        }}
        updateFilter={() => {}}
      />
      
      <CardEnhanced variant="elevated">
        <CardEnhancedHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );

  // Error state component
  const ErrorView = () => (
    <div className="space-y-6">
      <CardEnhanced variant="default" className="border-destructive/20">
        <CardEnhancedContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Property Data Unavailable</h3>
          <p className="text-muted-foreground">
            Unable to load property data. Please check your connection and try again.
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );

  // Show loading or error states
  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView />;

  return (
    <div className="space-y-6">
      {/* Property Filters Panel */}
      <PropertyFiltersPanel
        selectedPropertyTypes={filters.selectedPropertyTypes}
        onPropertyTypeChange={(types) => updateFilter('selectedPropertyTypes', types)}
        selectedPortfolios={filters.selectedPortfolios}
        onPortfoliosChange={(portfolios) => updateFilter('selectedPortfolios', portfolios)}
        selectedProperties={filters.selectedProperties}
        onPropertiesChange={(properties) => updateFilter('selectedProperties', properties)}
        dateRange={filters.dateRange}
        onDateRangeChange={(dateRange) => updateFilter('dateRange', dateRange)}
        onClearFilters={() => {
          clearFilters();
          // Trigger data refresh when filters are cleared
          setTimeout(() => refetch(), 100);
        }}
        isApplying={isApplying}
        userId={currentUserId}
        portfolioId={portfolioId}
        filters={filters}
        updateFilter={updateFilter}
      />

      {/* Filtered Analytics Summary */}
      {hasActiveFilters && analytics && (
        <CardEnhanced variant="default" className="border-l-4 border-l-primary">
          <CardEnhancedContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{(analytics as any).totalUnits || analytics.totalProperties}</div>
                <div className="text-xs text-muted-foreground">
                  {(analytics as any).totalUnits ? 'Units' : 'Properties'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${analytics.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.occupancyRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Occupancy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analytics.vacantProperties}</div>
                <div className="text-xs text-muted-foreground">Vacant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${analytics.averageRent.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Avg Rent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{analytics.avgDaysOnMarket.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Days on Market</div>
              </div>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      )}

      <CardEnhanced variant="elevated" className="border-0 shadow-md">
        <CardEnhancedHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {totalUnitCount > properties.length ? (
                <>
                  {totalUnitCount} Units ({properties.length} {properties.length === 1 ? 'Property' : 'Properties'})
                </>
              ) : (
                <>
                  {displayProperties.length} {displayProperties.length === 1 ? 'Property' : 'Properties'}
                </>
              )}
              {hasActiveFilters && (
                <span className="ml-1 text-primary">• Filtered</span>
              )}
            </Badge>
          </div>
        </CardEnhancedHeader>

        <CardEnhancedContent className="pt-0">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-openkey-blue">
                  Property Analytics
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  {totalFavorites} Favorites
                </Badge>
                <Button
                  variant={showCustomizeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCustomizeMode(!showCustomizeMode)}
                  className="gap-2"
                >
                  <Star className="h-4 w-4" />
                  {showCustomizeMode ? 'Done' : 'Customize'}
                </Button>
              </div>
            </div>


            {/* Portfolio Overview Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-openkey-blue flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Portfolio Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {analytics ? (
                <>
                  <ModernMetricCard
                    title={(analytics as any).totalUnits ? "Total Units" : "Total Properties"}
                    value={(analytics as any).totalUnits || analytics.totalProperties}
                    formatValue="number"
                    icon={Building2}
                    subtitle={(analytics as any).totalUnits ? `${analytics.totalProperties} properties` : undefined}
                    tooltip={getMetricTooltip('totalProperties')}
                    widgetId="properties-total-units"
                    isFavorited={isFavorited('properties-total-units')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Total Units')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Total Revenue"
                    value={analytics.totalRevenue}
                    formatValue="currency"
                    icon={DollarSign}
                    tooltip={getMetricTooltip('totalRevenue')}
                    widgetId="properties-total-revenue"
                    isFavorited={isFavorited('properties-total-revenue')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Total Revenue')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Occupancy Rate"
                    value={analytics.occupancyRate}
                    formatValue="percentage"
                    icon={Percent}
                    trend={{ 
                      value: analytics.occupancyRate > 85 ? 5 : -5, 
                      isPositive: analytics.occupancyRate > 85, 
                      period: 'vs target' 
                    }}
                    tooltip={getMetricTooltip('occupancyRate')}
                    widgetId="properties-occupancy-rate"
                    isFavorited={isFavorited('properties-occupancy-rate')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Occupancy Rate')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Average Rent"
                    value={analytics.averageRent}
                    formatValue="currency"
                    icon={DollarSign}
                    tooltip={getMetricTooltip('averageRent')}
                    widgetId="properties-average-rent"
                    isFavorited={isFavorited('properties-average-rent')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Average Rent')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Vacant Units"
                    value={analytics.vacantProperties}
                    formatValue="number"
                    icon={Home}
                    subtitle="available properties"
                    widgetId="properties-vacant-units"
                    isFavorited={isFavorited('properties-vacant-units')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Vacant Units')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Occupied Units"
                    value={analytics.occupiedProperties}
                    formatValue="number"
                    icon={Users}
                    subtitle="rented properties"
                    widgetId="properties-occupied-units"
                    isFavorited={isFavorited('properties-occupied-units')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Occupied Units')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Avg Days on Market"
                    value={analytics.avgDaysOnMarket}
                    formatValue="number"
                    icon={Calendar}
                    subtitle="for vacant units"
                    widgetId="properties-days-on-market"
                    isFavorited={isFavorited('properties-days-on-market')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Avg Days on Market')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Revenue per Sq Ft"
                    value={analytics.revenuePerSqFt}
                    formatValue="currency"
                    icon={Building2}
                    subtitle="annual"
                    widgetId="properties-revenue-per-sqft"
                    isFavorited={isFavorited('properties-revenue-per-sqft')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Revenue per Sq Ft')}
                    showFavoriteButton={true}
                  />
                </>
              ) : (
                <>
                  <ModernMetricCard
                    title="Total Properties"
                    value={displayProperties.length}
                    formatValue="number"
                    icon={Building2}
                    widgetId="properties-total-properties"
                    isFavorited={isFavorited('properties-total-properties')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Total Properties')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Portfolio Value"
                    value={modernFinancialMetrics?.grossRentMultiplier ? displayProperties.reduce((sum, p) => sum + ((p.monthly_rent || 0) * 12 * (modernFinancialMetrics.grossRentMultiplier || 10)), 0) : 0}
                    formatValue="currency"
                    icon={DollarSign}
                    widgetId="properties-portfolio-value"
                    isFavorited={isFavorited('properties-portfolio-value')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Portfolio Value')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Monthly Revenue"
                    value={displayProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0)}
                    formatValue="currency"
                    icon={DollarSign}
                    widgetId="properties-monthly-revenue"
                    isFavorited={isFavorited('properties-monthly-revenue')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Monthly Revenue')}
                    showFavoriteButton={true}
                  />
                  <ModernMetricCard
                    title="Average Rent"
                    value={displayProperties.length > 0 ? displayProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) / displayProperties.length : 0}
                    formatValue="currency"
                    icon={DollarSign}
                    widgetId="properties-average-rent-calc"
                    isFavorited={isFavorited('properties-average-rent-calc')}
                    onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'portfolio-overview', 'Average Rent')}
                    showFavoriteButton={true}
                  />
                </>
              )}
            </div>
            </div>

            {/* Financial Performance */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-openkey-blue flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <ModernMetricCard
                  title="Cap Rate"
                  value={modernFinancialMetrics.capRate}
                  formatValue="percentage"
                  icon={DollarSign}
                  trend={{ value: 0.3, isPositive: true, period: 'vs market avg' }}
                  tooltip={getMetricTooltip('capRate')}
                  widgetId="properties-cap-rate"
                  isFavorited={isFavorited('properties-cap-rate')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Cap Rate', 'metric', {
                    value: modernFinancialMetrics.capRate,
                    formatValue: 'percentage',
                    icon: 'dollar-sign',
                    trend: { value: 0.3, isPositive: true, period: 'vs market avg' }
                  })}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Cash on Cash Return"
                  value={modernFinancialMetrics.cashOnCashReturn}
                  formatValue="percentage"
                  icon={TrendingUp}
                  trend={{ value: modernFinancialMetrics.rentGrowthYoY, isPositive: modernFinancialMetrics.rentGrowthYoY > 0, period: 'YoY' }}
                  tooltip={getMetricTooltip('cashOnCashReturn')}
                  widgetId="properties-cash-on-cash"
                  isFavorited={isFavorited('properties-cash-on-cash')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Cash on Cash Return', 'metric', {
                    value: modernFinancialMetrics.cashOnCashReturn,
                    formatValue: 'percentage',
                    icon: 'trending-up',
                    trend: { value: modernFinancialMetrics.rentGrowthYoY, isPositive: modernFinancialMetrics.rentGrowthYoY > 0, period: 'YoY' }
                  })}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Rent Growth YoY"
                  value={modernFinancialMetrics.rentGrowthYoY}
                  formatValue="percentage"
                  icon={TrendingUp}
                  widgetId="properties-rent-growth"
                  isFavorited={isFavorited('properties-rent-growth')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Rent Growth YoY')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Operating Expense Ratio"
                  value={modernFinancialMetrics.operatingExpenseRatio}
                  formatValue="percentage"
                  icon={DollarSign}
                  tooltip={getMetricTooltip('operatingExpenseRatio')}
                  widgetId="properties-expense-ratio"
                  isFavorited={isFavorited('properties-expense-ratio')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Operating Expense Ratio')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Revenue per Sq Ft"
                  value={modernFinancialMetrics.revenuePerSqFt}
                  formatValue="currency"
                  icon={Building2}
                  widgetId="properties-revenue-sqft"
                  isFavorited={isFavorited('properties-revenue-sqft')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Revenue per Sq Ft')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Gross Rent Multiplier"
                  value={modernFinancialMetrics.grossRentMultiplier}
                  formatValue="number"
                  icon={DollarSign}
                  widgetId="properties-rent-multiplier"
                  isFavorited={isFavorited('properties-rent-multiplier')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Gross Rent Multiplier', 'metric', {
                    value: modernFinancialMetrics.grossRentMultiplier,
                    formatValue: 'number',
                    icon: 'dollar-sign'
                  })}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Debt Service Coverage"
                  value={modernFinancialMetrics.debtServiceCoverageRatio}
                  formatValue="number"
                  icon={DollarSign}
                  widgetId="properties-debt-coverage"
                  isFavorited={isFavorited('properties-debt-coverage')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Debt Service Coverage')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Market Rent Variance"
                  value={modernFinancialMetrics.marketRentVariance}
                  formatValue="percentage"
                  icon={TrendingUp}
                  trend={{ 
                    value: Math.abs(modernFinancialMetrics.marketRentVariance), 
                    isPositive: modernFinancialMetrics.marketRentVariance > 0, 
                    period: 'vs market' 
                  }}
                  widgetId="properties-rent-variance"
                  isFavorited={isFavorited('properties-rent-variance')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'financial-performance', 'Market Rent Variance')}
                  showFavoriteButton={true}
                />
              </div>
            </div>
            
            {/* View All Financial Analytics Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                variant="outline"
                className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 hover:border-primary/30"
                onClick={navigateToFinancialPerformance}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                View All Financial Analytics
              </Button>
            </div>

            {/* Operational Performance */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-openkey-blue flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Operational Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <ModernMetricCard
                  title="Days to Fill Vacancy"
                  value={operationalExcellence.daysToFillVacancy}
                  formatValue="number"
                  icon={Building2}
                  subtitle="average days"
                  widgetId="properties-days-vacancy"
                  isFavorited={isFavorited('properties-days-vacancy')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Days to Fill Vacancy')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Leasing Velocity"
                  value={operationalExcellence.leasingVelocity}
                  formatValue="number"
                  icon={TrendingUp}
                  subtitle="units/month"
                  widgetId="properties-leasing-velocity"
                  isFavorited={isFavorited('properties-leasing-velocity')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Leasing Velocity')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Application to Lease Ratio"
                  value={operationalExcellence.applicationToLeaseRatio}
                  formatValue="percentage"
                  icon={Users}
                  widgetId="properties-app-lease-ratio"
                  isFavorited={isFavorited('properties-app-lease-ratio')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Application to Lease Ratio')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Maintenance Response Time"
                  value={operationalExcellence.maintenanceResponseTime}
                  formatValue="number"
                  icon={Wrench}
                  subtitle="hours avg"
                  widgetId="properties-maintenance-response"
                  isFavorited={isFavorited('properties-maintenance-response')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Maintenance Response Time')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="First Call Resolution"
                  value={operationalExcellence.firstCallResolutionRate}
                  formatValue="percentage"
                  icon={Wrench}
                  widgetId="properties-first-call-resolution"
                  isFavorited={isFavorited('properties-first-call-resolution')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'First Call Resolution')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Preventive Maintenance"
                  value={operationalExcellence.preventiveMaintenanceRatio}
                  formatValue="percentage"
                  icon={Wrench}
                  widgetId="properties-preventive-maintenance"
                  isFavorited={isFavorited('properties-preventive-maintenance')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Preventive Maintenance')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Vendor Performance"
                  value={operationalExcellence.vendorPerformanceScore}
                  formatValue="number"
                  icon={Users}
                  subtitle="score (1-100)"
                  widgetId="properties-vendor-performance"
                  isFavorited={isFavorited('properties-vendor-performance')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Vendor Performance')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Inspection Compliance"
                  value={operationalExcellence.inspectionComplianceRate}
                  formatValue="percentage"
                  icon={Building2}
                  widgetId="properties-inspection-compliance"
                  isFavorited={isFavorited('properties-inspection-compliance')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'operational-excellence', 'Inspection Compliance')}
                  showFavoriteButton={true}
                />
              </div>
              
              {/* View All Operational Performance Button */}
              <div className="mt-6 flex justify-center">
                <Button 
                  variant="outline"
                  className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 hover:border-primary/30"
                  onClick={navigateToOperationalPerformance}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  View All Operational Performance
                </Button>
              </div>
            </div>

            {/* Current Performance */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-openkey-blue flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tenant Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <ModernMetricCard
                  title="Tenant Satisfaction"
                  value={operationalExcellence.tenantSatisfactionScore}
                  formatValue="number"
                  icon={Users}
                  subtitle="out of 5.0"
                  widgetId="properties-tenant-satisfaction"
                  isFavorited={isFavorited('properties-tenant-satisfaction')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Tenant Satisfaction')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Tenant Retention Rate"
                  value={operationalExcellence.tenantRetentionRate}
                  formatValue="percentage"
                  icon={Users}
                  widgetId="properties-tenant-retention"
                  isFavorited={isFavorited('properties-tenant-retention')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Tenant Retention Rate')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Renewal Rate"
                  value={operationalExcellence.renewalRate}
                  formatValue="percentage"
                  icon={TrendingUp}
                  widgetId="properties-renewal-rate"
                  isFavorited={isFavorited('properties-renewal-rate')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Renewal Rate')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Complaint Resolution Time"
                  value={operationalExcellence.complaintResolutionTime}
                  formatValue="number"
                  icon={Wrench}
                  subtitle="days avg"
                  widgetId="properties-complaint-resolution"
                  isFavorited={isFavorited('properties-complaint-resolution')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Complaint Resolution Time')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Safety Incident Rate"
                  value={operationalExcellence.safetyIncidentRate}
                  formatValue="number"
                  icon={AlertCircle}
                  subtitle="per 100 units"
                  widgetId="properties-safety-incidents"
                  isFavorited={isFavorited('properties-safety-incidents')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Safety Incident Rate')}
                  showFavoriteButton={true}
                />
                <ModernMetricCard
                  title="Insurance Claim Frequency"
                  value={operationalExcellence.insuranceClaimFrequency}
                  formatValue="number"
                  icon={AlertCircle}
                  subtitle="annual rate"
                  widgetId="properties-insurance-claims"
                  isFavorited={isFavorited('properties-insurance-claims')}
                  onToggleFavorite={(widgetId) => handleToggleFavorite(widgetId, 'properties', 'current-performance', 'Insurance Claim Frequency')}
                  showFavoriteButton={true}
                />
              </div>
              
              {/* View All Tenant Analytics Button */}
              <div className="mt-6 flex justify-center">
                <Button 
                  variant="outline"
                  className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 hover:border-primary/30"
                  onClick={navigateToTenantAnalytics}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View All Tenant Analytics
                </Button>
              </div>
            </div>





          </div>
        </CardEnhancedContent>
      </CardEnhanced>

    </div>
  );
};

export default PropertyAnalyticsView;