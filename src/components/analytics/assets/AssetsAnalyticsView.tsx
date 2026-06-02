import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoldingsKpis } from './HoldingsKpis';
import { AllocationByTypeChart } from './AllocationByTypeChart';
import { TopMovers } from './TopMovers';
import { IndividualAssetWidget } from './widgets/IndividualAssetWidget';
import { FavoriteChartWrapper } from '../wrappers/FavoriteChartWrapper';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import type { SupportedCurrency } from '@/lib/currencyUtils';

// Core Metrics
import { TotalGainLossWidget } from './widgets/TotalGainLossWidget';
import { DiversificationScoreWidget } from './widgets/DiversificationScoreWidget';
import { BestPerformerWidget } from './widgets/BestPerformerWidget';
import { WorstPerformerWidget } from './widgets/WorstPerformerWidget';

// Charts & Trends
import { PortfolioPerformanceTimeline } from './widgets/PortfolioPerformanceTimeline';
import { AssetPriceTrends } from './widgets/AssetPriceTrends';
import { AssetClassDistribution } from './widgets/AssetClassDistribution';
import { SectorAllocation } from './widgets/SectorAllocation';
import { GeographicDistribution } from './widgets/GeographicDistribution';
import { HistoricalPerformanceComparison } from './widgets/HistoricalPerformanceComparison';

// Analysis Tools
import { CorrelationMatrix } from './widgets/CorrelationMatrix';
import { RiskReturnScatter } from './widgets/RiskReturnScatter';
import { VolatilityAnalysis } from './widgets/VolatilityAnalysis';
import { DrawdownAnalysis } from './widgets/DrawdownAnalysis';
import { SharpeRatioCalculator } from './widgets/SharpeRatioCalculator';
import { PortfolioRebalancing } from './widgets/PortfolioRebalancing';
import { PerformanceAttribution } from './widgets/PerformanceAttribution';

// Market Intelligence
import { MarketSentiment } from './widgets/MarketSentiment';
import { VolumeAnalysis } from './widgets/VolumeAnalysis';
import { PriceAlertsSummary } from './widgets/PriceAlertsSummary';
import { MarketNewsFeed } from './widgets/MarketNewsFeed';
import { EconomicCalendar } from './widgets/EconomicCalendar';
import { PeerPortfolioComparison } from './widgets/PeerPortfolioComparison';
import { BenchmarkComparison } from './widgets/BenchmarkComparison';

interface AssetsAnalyticsViewProps {
  holdingsSummary?: any;
  isHoldingsLoading: boolean;
  currency?: SupportedCurrency;
  visibleColumns?: string[];
  availableColumns?: Array<{ id: string; label: string }>;
  onToggleColumn?: (columnId: string) => void;
  visibleWidgets?: string[];
  userId?: string;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const AssetsAnalyticsView = ({
  holdingsSummary,
  isHoldingsLoading,
  currency,
  visibleColumns = [],
  availableColumns = [],
  onToggleColumn,
  visibleWidgets = [],
  userId,
  timeframe = 'ytd',
}: AssetsAnalyticsViewProps) => {
  const { isFavorited, toggleFavorite } = useWidgetFavorites(userId || 'default-user');
  
  const displayData = holdingsSummary || {
    total_assets: 0,
    market_value: 0,
    cost_basis: 0,
    unrealized_gain_loss: 0,
    annual_income: 0,
    annual_expenses: 0,
  };

  // Separate individual asset widgets from portfolio widgets
  const individualAssetWidgets = visibleWidgets.filter(id => id.startsWith('individual-asset-'));
  const portfolioWidgets = visibleWidgets.filter(id => !id.startsWith('individual-asset-'));
  
  // Check which core widgets are visible
  const coreMetricIds = ['asset-count', 'total-portfolio-value', 'portfolio-change-24h', 'portfolio-return'];
  const visibleCoreMetrics = coreMetricIds.filter(id => portfolioWidgets.includes(id));
  const showKpis = visibleCoreMetrics.length > 0;
  const showAllocation = portfolioWidgets.includes('asset-allocation-chart');
  const showTopMovers = portfolioWidgets.includes('top-movers-chart');
  
  // Core Metrics
  const showTotalGainLoss = portfolioWidgets.includes('total-gain-loss');
  const showDiversificationScore = portfolioWidgets.includes('diversification-score');
  const showBestPerformer = portfolioWidgets.includes('best-performer');
  const showWorstPerformer = portfolioWidgets.includes('worst-performer');
  
  // Charts & Trends
  const showPerformanceTimeline = portfolioWidgets.includes('portfolio-performance-timeline');
  const showAssetPriceTrends = portfolioWidgets.includes('asset-price-trends');
  const showAssetClassDistribution = portfolioWidgets.includes('asset-class-distribution');
  const showSectorAllocation = portfolioWidgets.includes('sector-allocation');
  const showGeographicDistribution = portfolioWidgets.includes('geographic-distribution');
  const showHistoricalPerformance = portfolioWidgets.includes('historical-performance-comparison');
  
  // Analysis Tools
  const showCorrelationMatrix = portfolioWidgets.includes('correlation-matrix');
  const showRiskReturnScatter = portfolioWidgets.includes('risk-return-scatter');
  const showVolatilityAnalysis = portfolioWidgets.includes('volatility-analysis');
  const showDrawdownAnalysis = portfolioWidgets.includes('drawdown-analysis');
  const showSharpeRatioCalculator = portfolioWidgets.includes('sharpe-ratio-calculator');
  const showPortfolioRebalancing = portfolioWidgets.includes('portfolio-rebalancing');
  const showPerformanceAttribution = portfolioWidgets.includes('performance-attribution');
  
  // Market Intelligence
  const showMarketSentiment = portfolioWidgets.includes('market-sentiment');
  const showVolumeAnalysis = portfolioWidgets.includes('volume-analysis');
  const showPriceAlertsSummary = portfolioWidgets.includes('price-alerts-summary');
  const showMarketNewsFeed = portfolioWidgets.includes('market-news-feed');
  const showEconomicCalendar = portfolioWidgets.includes('economic-calendar');
  const showPeerComparison = portfolioWidgets.includes('peer-portfolio-comparison');
  const showBenchmarkComparison = portfolioWidgets.includes('benchmark-comparison');

  return (
    <div className="space-y-4">
      {/* Individual Asset Widgets */}
      {individualAssetWidgets.length > 0 && userId && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {individualAssetWidgets.map((widgetId) => {
            const assetId = widgetId.replace('individual-asset-', '');
            return (
              <IndividualAssetWidget
                key={widgetId}
                assetId={assetId}
                userId={userId}
                currency={currency}
                timeframe={timeframe}
              />
            );
          })}
        </div>
      )}
      
      {/* Grid for KPIs and Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 auto-rows-auto">
        {/* Row 1 — KPI row fills both columns */}
        {showKpis && (
          <div className="lg:col-span-2">
            <HoldingsKpis
              data={displayData}
              isLoading={isHoldingsLoading}
              currency={currency}
              isFavorited={isFavorited}
              onToggleFavorite={toggleFavorite}
              onDelete={(widgetId) => {
                // Remove from favorites when deleted
                toggleFavorite(widgetId);
              }}
              visibleMetrics={visibleCoreMetrics}
              timeframe={timeframe}
            />
          </div>
        )}

        {/* Row 2 — Asset Allocation (left half) */}
        {showAllocation && (
          <FavoriteChartWrapper
            widgetId="assets-allocation-chart"
            title="Asset Allocation"
            tab="financial"
            category="assets"
            isFavorited={isFavorited('assets-allocation-chart')}
            onToggleFavorite={toggleFavorite}
            onDelete={() => {
              toggleFavorite('assets-allocation-chart');
            }}
          >
            <Card className="bg-card border-border col-span-1 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationByTypeChart
                  data={holdingsSummary?.allocation_by_type || {}}
                  isLoading={isHoldingsLoading}
                  currency={currency}
                />
              </CardContent>
            </Card>
          </FavoriteChartWrapper>
        )}

        {/* Row 2 — Top Movers (right half) */}
        {showTopMovers && (
          <FavoriteChartWrapper
            widgetId="assets-top-movers"
            title="Top Movers"
            tab="financial"
            category="assets"
            isFavorited={isFavorited('assets-top-movers')}
            onToggleFavorite={toggleFavorite}
            onDelete={() => {
              toggleFavorite('assets-top-movers');
            }}
          >
            <Card className="bg-card border-border col-span-1 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top Movers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMovers
                  topMovers={holdingsSummary?.top_movers || []}
                  isLoading={isHoldingsLoading}
                  currency={currency}
                  timeframe={timeframe}
                />
              </CardContent>
            </Card>
          </FavoriteChartWrapper>
        )}
      </div>
      
      {/* Additional Core Metrics */}
      {(showTotalGainLoss || showDiversificationScore || showBestPerformer || showWorstPerformer) && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {showTotalGainLoss && <TotalGainLossWidget currency={currency} />}
          {showDiversificationScore && <DiversificationScoreWidget />}
          {showBestPerformer && <BestPerformerWidget currency={currency} />}
          {showWorstPerformer && <WorstPerformerWidget currency={currency} />}
        </div>
      )}
      
      {/* Charts & Trends Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {showPerformanceTimeline && (
          <div className="lg:col-span-2">
            <FavoriteChartWrapper
              widgetId="portfolio-performance-timeline"
              title="Portfolio Performance Over Time"
              tab="financial"
              category="assets"
              isFavorited={isFavorited('portfolio-performance-timeline')}
              onToggleFavorite={toggleFavorite}
              onDelete={() => {
                toggleFavorite('portfolio-performance-timeline');
              }}
            >
              <PortfolioPerformanceTimeline />
            </FavoriteChartWrapper>
          </div>
        )}
        
        {showAssetPriceTrends && (
          <div className="lg:col-span-2">
            <AssetPriceTrends />
          </div>
        )}
        
        {showAssetClassDistribution && <AssetClassDistribution />}
        {showSectorAllocation && <SectorAllocation />}
        {showGeographicDistribution && <GeographicDistribution />}
        {showHistoricalPerformance && <HistoricalPerformanceComparison />}
      </div>
      
      {/* Analysis Tools Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {showCorrelationMatrix && (
          <div className="lg:col-span-2">
            <CorrelationMatrix />
          </div>
        )}
        
        {showRiskReturnScatter && <RiskReturnScatter />}
        {showDrawdownAnalysis && <DrawdownAnalysis />}
        {showVolatilityAnalysis && <VolatilityAnalysis />}
        {showSharpeRatioCalculator && <SharpeRatioCalculator />}
        {showPortfolioRebalancing && <PortfolioRebalancing />}
        {showPerformanceAttribution && <PerformanceAttribution />}
      </div>
      
      {/* Market Intelligence Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {showMarketSentiment && <MarketSentiment />}
        {showVolumeAnalysis && <VolumeAnalysis />}
        
        {showBenchmarkComparison && (
          <div className="lg:col-span-2">
            <BenchmarkComparison />
          </div>
        )}
        
        {showPeerComparison && <PeerPortfolioComparison />}
        {showPriceAlertsSummary && <PriceAlertsSummary />}
        {showMarketNewsFeed && <MarketNewsFeed />}
        {showEconomicCalendar && <EconomicCalendar />}
      </div>
    </div>
  );
};
