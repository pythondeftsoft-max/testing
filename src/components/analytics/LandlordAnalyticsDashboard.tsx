import React, { useState } from 'react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsPermissionWrapper } from './AnalyticsPermissionWrapper';
import { RefreshCcw, FileDown, DollarSign, Building, Users, TrendingUp, TrendingDown, CheckCircle, Home, Wrench, Target, Calendar, AlertTriangle, Zap, Plus, X, AlertCircle, Brain } from 'lucide-react';
import { useAnalyticsNavigation } from '@/hooks/useAnalyticsNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { PortfolioAssetDashboard } from '@/components/portfolio/PortfolioAssetDashboard';
import { CrossPortfolioAssetsDashboard } from './assets/CrossPortfolioAssetsDashboard';
import { AllAssetsManager } from './assets/AllAssetsManager';
import { useLandlordAnalytics } from '@/hooks/useLandlordAnalytics';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';
import { usePaymentAnalytics } from '@/hooks/usePaymentAnalytics';
import { useEnhancedPortfolioAnalytics } from '@/hooks/useEnhancedPortfolioAnalytics';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';
import { useHoldingsSummary } from '@/hooks/useHoldingsSummary';
import { useUserAssets } from '@/hooks/useUserAssets';
import { PaymentAnalyticsHub } from './PaymentAnalyticsHub';
import PropertyAnalyticsView from '@/components/portfolio/PropertyAnalyticsView';

import EnhancedMetricCard from './EnhancedMetricCard';
import EnhancedWaterfallChart from './charts/EnhancedWaterfallChart';
import RevenueBreakdownPro from './RevenueBreakdownPro';
import EnhancedGaugeChart from './charts/EnhancedGaugeChart';
import ModernAreaChart from './charts/ModernAreaChart';
import CashFlowRiverChart from './charts/CashFlowRiverChart';
import ROISpeedometerChart from './charts/ROISpeedometerChart';
import MarketPositionRadarChart from './charts/MarketPositionRadarChart';
import ReportExportModal from './ReportExportModal';
import PaymentAnalyticsPanel from './PaymentAnalyticsPanel';
import PremiumPortfolioHealthDashboard from './premium/PremiumPortfolioHealthDashboard';
import { CurrentVsPredictiveCard } from './predictive/CurrentVsPredictiveCard';
import { PredictiveTrendChart } from './predictive/PredictiveTrendChart';
import { EnhancedPortfolioHealthScore } from './predictive/EnhancedPortfolioHealthScore';
import { GenerateMoreWidgetsButton } from './GenerateMoreWidgetsButton';
import { usePredictiveWidgetState } from '@/hooks/usePredictiveWidgetState';
import { getWidgetsForCategory, WIDGET_CATALOG } from '@/utils/widgetCatalog';
import { PredictiveWidgetWrapper } from './wrappers/PredictiveWidgetWrapper';
import { PredictiveMetricCard } from './predictive/PredictiveMetricCard';
import { PredictiveChartCard } from './predictive/PredictiveChartCard';
import { PredictiveAnalysisPanel } from './predictive/PredictiveAnalysisPanel';
import type { WidgetDefinition } from '@/types/widgetTypes';


import { ErrorBoundary } from 'react-error-boundary';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import { AnalyticsErrorBoundary } from './AnalyticsErrorBoundary';
import { AddWidgetModal, type CustomWidget } from '@/components/analytics/widgets/AddWidgetModal';
import { CustomWidgetRenderer } from '@/components/analytics/widgets/CustomWidgetRenderer';

import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import FavoritesOverview from '@/components/analytics/FavoritesOverview';
import { FavoriteWidgetRenderer } from '@/components/analytics/FavoriteWidgetRenderer';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import PropertyFiltersPanel from './PropertyFiltersPanel';
import { mapDateRangeToTimeframe } from '@/utils/dateToTimeframeMapper';

interface LandlordAnalyticsDashboardProps {
  landlordId: string;
  portfolioId?: string;
}

const LandlordAnalyticsDashboard = ({ landlordId, portfolioId }: LandlordAnalyticsDashboardProps) => {
  const { currentTab, currentSubtab, updateTab, navigateToAssets } = useAnalyticsNavigation();
  
  // Helper to get Year to Date range for default filters
  const getYearToDateRange = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
    return {
      from: yearStart,
      to: now,
    };
  };

  // Helper to check if date range is YTD (for smart default detection)
  const isYearToDateRange = (dateRange: { from: Date | undefined; to: Date | undefined }) => {
    if (!dateRange.from || !dateRange.to) return false;
    
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    // Check if 'from' is Jan 1 of current year (within 1 day tolerance)
    const fromTime = dateRange.from.getTime();
    const yearStartTime = yearStart.getTime();
    const isFromYearStart = Math.abs(fromTime - yearStartTime) < (1000 * 60 * 60 * 24);
    
    // Check if 'to' is today (within 1 day tolerance)
    const toTime = dateRange.to.getTime();
    const nowTime = now.getTime();
    const isToToday = Math.abs(toTime - nowTime) < (1000 * 60 * 60 * 24);
    
    return isFromYearStart && isToToday;
  };
  
  // Debug logging for authentication
  console.log('📊 [LandlordAnalyticsDashboard] Received props:', { 
    landlordId, 
    portfolioId,
    landlordIdValid: !!landlordId,
    landlordIdType: typeof landlordId,
    landlordIdLength: landlordId?.length,
    portfolioIdValue: portfolioId 
  });

  // Debug authentication session
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('📊 [LandlordAnalyticsDashboard] Authentication check:', {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionUserEmail: session?.user?.email,
        propLandlordId: landlordId,
        userIdMatch: session?.user?.id === landlordId,
        sessionError: error
      });
    };
    checkAuth();
  }, [landlordId]);
  
  const {
    portfolioOverview,
    leasePipeline,
    rentDelinquency,
    maintenanceEfficiency,
    topLatePayers,
    loading: basicLoading,
    error: basicAnalyticsError,
    refetch: refetchBasicAnalytics
  } = useLandlordAnalytics(landlordId);

  const {
    data: enhancedData,
    isLoading: enhancedLoading,
    error: enhancedError,
    refetch: refetchEnhanced
  } = useEnhancedLandlordAnalytics(landlordId, portfolioId);

  const enhancedMetrics = enhancedData?.enhancedMetrics;

  const {
    data: paymentData,
    loading: paymentLoading,
    error: paymentError,
    refetch: refetchPayment
  } = usePaymentAnalytics(landlordId);

  const {
    data: modernFinancials,
    isLoading: modernLoading,
    error: modernError,
    refetch: refetchModern
  } = useModernPropertyAnalytics(landlordId, portfolioId);

  const {
    data: portfolioAnalytics,
    isLoading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio
  } = useEnhancedPortfolioAnalytics(landlordId, portfolioId);

  const {
    data: holdingsData,
    isLoading: holdingsLoading,
    error: holdingsError,
    refetch: refetchHoldings
  } = useHoldingsSummary(landlordId, portfolioId);

  // Import useUserAssets for individual asset widgets
  const { data: userAssets } = useUserAssets(landlordId);

  const [showAssetWizard, setShowAssetWizard] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Initialize favorites system
  const { favoriteWidgetData, isFavorited, toggleFavorite, clearAllFavorites } = useWidgetFavorites(landlordId);

  // Initialize predictive widget state
  const { applyWidgetSelection, getVisibleWidgets, isWidgetVisible, deleteWidget } = usePredictiveWidgetState(landlordId);

  // Property filters for Custom Overview
  const {
    filters: propertyFilters,
    updateFilter: updatePropertyFilter,
    clearFilters: clearPropertyFilters,
    hasActiveFilters: hasActivePropertyFilters,
    isApplying: isApplyingPropertyFilters,
  } = usePropertyFilters();

  // Initialize filters with smart defaults on mount
  useEffect(() => {
    // Set YTD date range
    updatePropertyFilter('dateRange', getYearToDateRange());
    
    // Set portfolio context-aware default
    if (portfolioId && portfolioId !== 'everything') {
      updatePropertyFilter('selectedPortfolios', [portfolioId]);
    }
    // Note: selectedPropertyTypes and selectedProperties remain empty (meaning "all")
  }, []); // Run once on mount


  const handleAddWidget = (widget: CustomWidget) => {
    setCustomWidgets(prev => [...prev, widget]);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setCustomWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleRefresh = () => {
    refetchBasicAnalytics();
    refetchEnhanced();
    refetchPayment();
    refetchModern();
    refetchPortfolio();
    refetchHoldings();
  };

  const handleAssetAdded = () => {
    setShowAssetWizard(false);
    handleRefresh();
  };

  // Define missing variables
  const maintenanceAnalytics = {
    averageResolutionDays: maintenanceEfficiency?.avg_resolution_days || 3,
    totalOpenRequests: portfolioAnalytics?.maintenanceMetrics?.totalOpenRequests || 7
  };

  const predictiveAnalytics = {
    vacancyRiskScore: 15,
    renewalProbability: 85,
    insights: [],
    recommendations: []
  };

  const totalValue = 0;

  if (basicAnalyticsError || enhancedError || paymentError || modernError || portfolioError || holdingsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-navy-blue mb-2">Unable to Load Analytics</h3>
          <p className="text-navy-blue/70 mb-4">There was an error loading your analytics data.</p>
          <Button onClick={handleRefresh} variant="outline" className="gap-2 border-navy-blue/30 text-navy-blue hover:bg-navy-blue/10">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Generate sparkline data for metrics
  const generateSparklineData = (points: number) => {
    return Array.from({ length: points }, (_, i) => ({
      name: `Month ${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 500
    }));
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-blue-gold text-white relative overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Portfolio Analytics Dashboard
              </h1>
              <p className="text-white/90 text-lg">
                Comprehensive insights into your property portfolio performance
              </p>
            </div>
            <div className="flex flex-col space-y-3">
                <Button
                  onClick={() => setShowAssetWizard(true)}
                  className="bg-white text-openkey-blue border-0 hover:bg-white hover:text-openkey-blue"
                >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={currentTab} onValueChange={updateTab} className="space-y-6">
          <div className="overflow-x-auto" data-tour="analytics-tabs">
          <TabsList className="command-tabs flex w-max md:w-full md:grid md:grid-cols-4 items-center">
            <TabsTrigger 
              value="custom-overview" 
              data-tour="analytics-custom-overview"
              className="command-tab-trigger flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium"
            >
              Custom Overview
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              data-tour="analytics-ai-forecast"
              className="command-tab-trigger flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium"
            >
              AI Forecast and Health
            </TabsTrigger>
            <TabsTrigger 
              value="properties" 
              data-tour="analytics-property"
              className="command-tab-trigger flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium"
            >
              Property Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="assets" 
              data-tour="analytics-assets"
              className="command-tab-trigger flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium"
            >
              Assets
            </TabsTrigger>
          </TabsList>
          </div>
          
          {/* Custom Overview Tab */}
          <TabsContent value="custom-overview" className="space-y-6 mt-6">
            {/* Your Custom Dashboard */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-openkey-blue" />
                  <h2 className="text-xl font-semibold text-openkey-blue">Customize with Your Favorite Analytics</h2>
                  <Badge variant="secondary" className="bg-openkey-blue/10 text-openkey-blue border-openkey-blue/30">
                    {favoriteWidgetData.length + customWidgets.length} Widgets
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setShowClearConfirm(true)}
                    variant="outline"
                    size="sm"
                    disabled={favoriteWidgetData.length === 0 && customWidgets.length === 0}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Widgets
                  </Button>
                  <Button 
                    onClick={() => setShowAddWidgetModal(true)}
                    variant="blue"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Widget
                  </Button>
                </div>
              </div>

              {/* Filter Sections - Always Visible */}
              <div className="space-y-4">
                {/* Property Filters Panel */}
                <PropertyFiltersPanel
                  title="Filters"
                  selectedPropertyTypes={propertyFilters.selectedPropertyTypes}
                  onPropertyTypeChange={(types) => updatePropertyFilter('selectedPropertyTypes', types)}
                  selectedPortfolios={propertyFilters.selectedPortfolios}
                  onPortfoliosChange={(portfolios) => updatePropertyFilter('selectedPortfolios', portfolios)}
                  selectedProperties={propertyFilters.selectedProperties}
                  onPropertiesChange={(properties) => updatePropertyFilter('selectedProperties', properties)}
                  dateRange={propertyFilters.dateRange}
                  onDateRangeChange={(dateRange) => updatePropertyFilter('dateRange', dateRange)}
                  onClearFilters={() => {
                    // Reset to smart defaults instead of empty
                    clearPropertyFilters();
                    updatePropertyFilter('dateRange', getYearToDateRange());
                    if (portfolioId && portfolioId !== 'everything') {
                      updatePropertyFilter('selectedPortfolios', [portfolioId]);
                    }
                  }}
                  isApplying={isApplyingPropertyFilters}
                  userId={landlordId}
                  portfolioId={portfolioId}
                  filters={propertyFilters}
                  updateFilter={updatePropertyFilter}
                  isDateRangeDefault={isYearToDateRange(propertyFilters.dateRange)}
                  defaultPortfolios={portfolioId && portfolioId !== 'everything' ? [portfolioId] : []}
                />
              </div>
              
              {/* Show empty state if no widgets at all */}
              {favoriteWidgetData.length === 0 && customWidgets.length === 0 && (
                <FavoritesOverview 
                  currentUserId={landlordId}
                  onStartCustomizing={() => updateTab('analytics')}
                />
              )}
              
              {/* Unified Widgets Grid */}
              {(favoriteWidgetData.length > 0 || customWidgets.length > 0) && (
                <div className="grid grid-cols-8 gap-4 auto-rows-fr">
                  {/* Favorited Widgets */}
                  {favoriteWidgetData.map((widget) => (
                    <div
                      key={`favorite-${widget.id}`}
                      className="col-span-4 lg:col-span-2"
                    >
                  <FavoriteWidgetRenderer
                    widget={widget}
                    isFavorited={true}
                    onToggleFavorite={toggleFavorite}
                    onDelete={(widgetId) => toggleFavorite(widgetId)}
                    propertyFilters={propertyFilters}
                    assetFilters={{
                      portfolio: propertyFilters.selectedPortfolios.length > 0 
                        ? propertyFilters.selectedPortfolios[0] 
                        : 'everything',
                      timeframe: mapDateRangeToTimeframe(propertyFilters.dateRange)
                    }}
                  />
                    </div>
                  ))}
                  
                  {/* Custom Widgets */}
                  {customWidgets.map((widget) => (
                    <div
                      key={`custom-${widget.id}`}
                      className={
                        widget.size === 'small' ? 'col-span-2 lg:col-span-1' :
                        widget.size === 'medium' ? 'col-span-4 lg:col-span-2' :
                        widget.size === 'large' ? 'col-span-8 lg:col-span-4 row-span-2' :
                        widget.size === 'full-width' ? 'col-span-8' :
                        'col-span-4 lg:col-span-2' // default to medium
                      }
                    >
                      <CustomWidgetRenderer
                        widget={widget}
                        onRemove={handleRemoveWidget}
                        onToggleFavorite={(widgetId) => {
                          // Convert custom widget to favorite widget data
                          const widgetData = {
                            id: widgetId,
                            tab: 'custom-overview' as const,
                            category: 'custom',
                            title: widget.name,
                            componentType: 'panel' as const,
                            widgetProps: {
                              component: widget.config.component,
                              icon: widget.config.icon,
                              description: widget.description,
                            }
                          };
                          toggleFavorite(widgetId, widgetData);
                        }}
                        isFavorited={isFavorited(widget.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dashboard Management Panel */}
            <CardEnhanced variant="command" className="command-card">
              <CardEnhancedHeader>
                <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
                  <Target className="h-5 w-5" />
                  Dashboard Management
                </CardEnhancedTitle>
              </CardEnhancedHeader>
              <CardEnhancedContent>
                <div className="space-y-2 mb-4">
                  <p className="text-muted-foreground">
                    <strong>{favoriteWidgetData.length}</strong> favorited analytics widgets and <strong>{customWidgets.length}</strong> custom dashboard widgets. 
                    Star widgets in analytics tabs to add them to your favorites here!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Visit the Analytics tab and star (⭐) widgets to add them to your favorites here!
                  </p>
                </div>
                
                {customWidgets.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-openkey-blue">Current Custom Widgets:</h4>
                    <div className="flex flex-wrap gap-2">
                      {customWidgets.map((widget) => (
                        <Badge key={widget.id} variant="secondary" className="gap-1">
                          {widget.name}
                          <button
                            onClick={() => handleRemoveWidget(widget.id)}
                            className="hover:text-red-600 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardEnhancedContent>
            </CardEnhanced>
            
            {/* Add Widget Modal */}
            <AddWidgetModal
              isOpen={showAddWidgetModal}
              onClose={() => setShowAddWidgetModal(false)}
              onAddWidget={handleAddWidget}
              userAssets={userAssets}
              userId={landlordId}
              existingWidgets={customWidgets}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8">
            <>
              {/* Enhanced Portfolio Health Score at the very top */}
              <div className="mb-8">
                <AnalyticsErrorBoundary title="Portfolio Health Dashboard">
                  <AnalyticsPermissionWrapper
                    portfolioId={portfolioId || 'default'}
                    analyticsType="portfolio_trends"
                  >
                    <EnhancedPortfolioHealthScore
                      landlordId={landlordId}
                      portfolioId={portfolioId}
                    />
                  </AnalyticsPermissionWrapper>
                </AnalyticsErrorBoundary>
              </div>

              {/* AI Forecasts and Health Overview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold text-foreground">AI Forecast and Health Overview</h2>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Current vs Predicted
                    </Badge>
                  </div>
                  <GenerateMoreWidgetsButton
                    category="predictive-analytics"
                    onApplySelection={(selectedWidgets) => {
                      const allPredictiveWidgetIds = WIDGET_CATALOG['predictive-analytics'].map(w => w.id);
                      applyWidgetSelection(selectedWidgets, 'predictive-analytics', allPredictiveWidgetIds);
                    }}
                    currentVisibleWidgets={getVisibleWidgets(
                      WIDGET_CATALOG['predictive-analytics'].map(w => w.id),
                      true
                    )}
                  />
                </div>

                {/* Dynamic Widget Rendering */}
                {(() => {
                  const visibleWidgetIds = getVisibleWidgets(
                    WIDGET_CATALOG['predictive-analytics'].map(w => w.id),
                    true
                  );
                  
                  // Group widgets by type for layout
                  const metricWidgets = visibleWidgetIds
                    .map(id => WIDGET_CATALOG['predictive-analytics'].find(w => w.id === id))
                    .filter(w => w?.componentType === 'metric');
                  
                  const chartWidgets = visibleWidgetIds
                    .map(id => WIDGET_CATALOG['predictive-analytics'].find(w => w.id === id))
                    .filter(w => w?.componentType === 'chart');
                  
                  const panelWidgets = visibleWidgetIds
                    .map(id => WIDGET_CATALOG['predictive-analytics'].find(w => w.id === id))
                    .filter(w => w?.componentType === 'panel');
                  
                  return (
                    <>
                      {/* Metrics Grid */}
                      {metricWidgets.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {metricWidgets.map((widget) => {
                            if (!widget) return null;
                            return (
                              <PredictiveWidgetWrapper
                                key={widget.id}
                                widgetId={widget.id}
                                title={widget.name}
                                tab="analytics"
                                category="predictive-analytics"
                                isFavorited={isFavorited(widget.id)}
                                onToggleFavorite={toggleFavorite}
                                onDelete={deleteWidget}
                                componentType="metric"
                                widgetDefinition={widget}
                              >
                                <PredictiveMetricCard widget={widget} />
                              </PredictiveWidgetWrapper>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Charts Grid */}
                      {chartWidgets.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {chartWidgets.map((widget) => {
                            if (!widget) return null;
                            return (
                              <PredictiveWidgetWrapper
                                key={widget.id}
                                widgetId={widget.id}
                                title={widget.name}
                                tab="analytics"
                                category="predictive-analytics"
                                isFavorited={isFavorited(widget.id)}
                                onToggleFavorite={toggleFavorite}
                                onDelete={deleteWidget}
                                componentType="chart"
                                widgetDefinition={widget}
                              >
                                <PredictiveChartCard widget={widget} />
                              </PredictiveWidgetWrapper>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Analysis Panels Grid */}
                      {panelWidgets.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {panelWidgets.map((widget) => {
                            if (!widget) return null;
                            return (
                              <PredictiveWidgetWrapper
                                key={widget.id}
                                widgetId={widget.id}
                                title={widget.name}
                                tab="analytics"
                                category="predictive-analytics"
                                isFavorited={isFavorited(widget.id)}
                                onToggleFavorite={toggleFavorite}
                                onDelete={deleteWidget}
                                componentType="panel"
                                widgetDefinition={widget}
                              >
                                <PredictiveAnalysisPanel widget={widget} />
                              </PredictiveWidgetWrapper>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            {!landlordId ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">User ID Missing</h3>
                    <p className="text-muted-foreground">Unable to load property analytics - user authentication required.</p>
                  </div>
                </div>
              </div>
            ) : (
              <PropertyAnalyticsView
                currentUserId={landlordId}
                portfolioId={portfolioId || 'everything'}
              />
            )}
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            {portfolioId && portfolioId !== 'everything' ? (
              <AnalyticsErrorBoundary title="Portfolio Asset Dashboard">
                <PortfolioAssetDashboard
                  portfolioId={portfolioId}
                />
              </AnalyticsErrorBoundary>
            ) : (
              <AnalyticsErrorBoundary title="Cross Portfolio Assets Dashboard">
                <CrossPortfolioAssetsDashboard 
                  userId={landlordId}
                />
              </AnalyticsErrorBoundary>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Clear Widgets Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Widgets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {favoriteWidgetData.length + customWidgets.length} widget{favoriteWidgetData.length + customWidgets.length !== 1 ? 's' : ''} from your Custom Overview dashboard.
              <br /><br />
              This includes:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>{favoriteWidgetData.length}</strong> favorited analytics widget{favoriteWidgetData.length !== 1 ? 's' : ''}</li>
                <li><strong>{customWidgets.length}</strong> custom dashboard widget{customWidgets.length !== 1 ? 's' : ''}</li>
              </ul>
              <br />
              You can always re-add widgets by starring them from the Analytics tab or using the Add Widget button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCustomWidgets([]);
                clearAllFavorites();
                setShowClearConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Widgets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset Wizard Modal */}
      {showAssetWizard && (
        <AddAssetWizard
          isOpen={showAssetWizard}
          onAssetAdded={handleAssetAdded}
          portfolioId={portfolioId}
        />
      )}
    </div>
  );
};

export default LandlordAnalyticsDashboard;