
import React from 'react';
import PortfolioPointsOverview from './PortfolioPointsOverview';
import RecentActivitySummary from './RecentActivitySummary';
import FavoritesOverview from '@/components/analytics/FavoritesOverview';
import PremiumPortfolioHealthDashboard from '@/components/analytics/premium/PremiumPortfolioHealthDashboard';
import { PortfolioAssetDashboard } from './PortfolioAssetDashboard';
import { ErrorBoundary } from 'react-error-boundary';
import { useEnhancedPortfolioAnalytics } from '@/hooks/useEnhancedPortfolioAnalytics';
import { AnalyticsPermissionWrapper } from '@/components/analytics/AnalyticsPermissionWrapper';

interface PortfolioAnalyticsPanelProps {
  portfolioId: string;
  currentUserId: string;
}

function ErrorFallback({error}: {error: Error}) {
  return (
    <div className="p-6 text-center border border-red-200 rounded-lg bg-red-50">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Portfolio Health Unavailable</h2>
      <p className="text-red-600 mb-4">There was an issue loading the portfolio health dashboard.</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Reload Page
      </button>
    </div>
  );
}

const PortfolioAnalyticsPanel = ({ portfolioId, currentUserId }: PortfolioAnalyticsPanelProps) => {
  // Real data via enhanced analytics hook
  const isEverything = !portfolioId || portfolioId === 'everything';
  const { data, isLoading, error } = useEnhancedPortfolioAnalytics(
    currentUserId,
    isEverything ? undefined : portfolioId
  );

  const handleStartCustomizing = () => {
    // Navigate to analytics tabs for widget customization
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', 'financial');
    window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n || 0)));

  const healthData = {
    occupancyRate: clampPct(data?.enhancedMetrics.occupancyRate ?? 0),
    collectionRate: clampPct(data?.enhancedMetrics.collectionRate ?? 0),
    averageMaintenanceResolutionDays: Math.round(
      (data?.maintenanceMetrics.averageResolutionDays ??
        data?.enhancedMetrics.maintenanceResponseTime ??
        0)
    ),
    onTimePaymentRate: clampPct(data?.paymentPerformance.onTimePaymentRate ?? 0),
    openMaintenanceRequests:
      data?.maintenanceMetrics.totalOpenRequests ??
      data?.enhancedMetrics.maintenanceRequestsOpen ??
      0,
    totalUnits: data?.enhancedMetrics.totalUnits ?? 0,
  };

  return (
    <div className="space-y-8">
      {/* Your Favorite Analytics Section */}
      <section>
        <FavoritesOverview 
          currentUserId={currentUserId}
          onStartCustomizing={handleStartCustomizing}
        />
      </section>

      {/* Portfolio Health Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Portfolio Health Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive health analysis of your portfolio performance
          </p>
        </div>
        <AnalyticsPermissionWrapper
          portfolioId={portfolioId || 'default'}
          analyticsType="dashboard"
        >
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            {error ? (
              <div className="p-6 text-center border rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Portfolio Health Unavailable</h2>
                <p className="mb-4">There was an issue loading the portfolio health dashboard.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded"
                >
                  Reload Page
                </button>
              </div>
            ) : isLoading ? (
              <div className="p-6 border rounded-lg">Loading portfolio health...</div>
            ) : (
              <PremiumPortfolioHealthDashboard {...healthData} landlordId={currentUserId} portfolioId={portfolioId} className="w-full" />
            )}
          </ErrorBoundary>
        </AnalyticsPermissionWrapper>
      </section>

      {/* Financial Performance Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Financial Performance</h2>
          <p className="text-sm text-muted-foreground">
            Key financial metrics and revenue analysis
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="col-span-full">
            <p className="text-muted-foreground">
              Financial performance metrics will be displayed here.
            </p>
          </div>
        </div>
      </section>

      {/* Operational Excellence Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Operational Performance</h2>
          <p className="text-sm text-muted-foreground">
            Operational efficiency and performance metrics
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Operational performance metrics will be displayed here.
          </p>
        </div>
      </section>

      {/* Performance Analytics Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Advanced performance insights and predictive analytics
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Performance analytics and predictions will be displayed here.
          </p>
        </div>
      </section>

      {/* Asset Management Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Asset Management</h2>
          <p className="text-sm text-muted-foreground">
            Portfolio asset allocation and management insights
          </p>
        </div>
        <AnalyticsPermissionWrapper
          portfolioId={portfolioId || 'default'}
          analyticsType="asset_allocation"
        >
          <PortfolioAssetDashboard portfolioId={portfolioId} />
        </AnalyticsPermissionWrapper>
      </section>

      {/* Activity & Points Section */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold">Activity & Performance Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Recent activities and performance points overview
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioPointsOverview portfolioId={portfolioId} currentUserId={currentUserId} />
          </div>
          <div className="lg:col-span-1">
            <RecentActivitySummary portfolioId={portfolioId} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default PortfolioAnalyticsPanel;
