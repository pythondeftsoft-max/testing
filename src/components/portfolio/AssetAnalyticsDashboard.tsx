import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Download, RefreshCw } from 'lucide-react';
import { useAssetAnalytics } from '@/hooks/useAssetAnalytics';
import { AssetPerformanceChart } from './AssetPerformanceChart';
import { AssetAllocationChart } from './AssetAllocationChart';
import { AssetPerformanceHeatmap } from './AssetPerformanceHeatmap';
import { AssetComparisonTable } from './AssetComparisonTable';
import { AssetPredictiveAnalytics } from './AssetPredictiveAnalytics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

interface AssetAnalyticsDashboardProps {
  portfolioId: string;
}

export const AssetAnalyticsDashboard = ({ portfolioId }: AssetAnalyticsDashboardProps) => {
  const { data: analytics, isLoading, error, refetch } = useAssetAnalytics(portfolioId);
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  const handleExportReport = () => {
    // In a real application, this would generate and download a PDF report
    console.log('Exporting analytics report for portfolio:', portfolioId);
    // You could integrate with libraries like jsPDF or send to a backend service
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-red-600 mb-4">Error loading analytics data</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Asset Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of your portfolio performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {analytics.totalROI >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={analytics.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}>
                {analytics.totalROI > 0 ? '+' : ''}{analytics.totalROI.toFixed(1)}% total ROI
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency(analytics.netMonthlyIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.averageROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.averageROI > 0 ? '+' : ''}{analytics.averageROI.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.totalAssets} assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 mb-2">
              <Badge variant="outline" className="text-green-700">
                {analytics.riskDistribution.low} Low
              </Badge>
              <Badge variant="outline" className="text-yellow-700">
                {analytics.riskDistribution.medium} Med
              </Badge>
              <Badge variant="outline" className="text-red-700">
                {analytics.riskDistribution.high} High
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topPerformingAssets[0] && (
              <>
                <div className="text-lg font-bold truncate">
                  {analytics.topPerformingAssets[0].name}
                </div>
                <div className="text-sm text-green-600">
                  +{analytics.topPerformingAssets[0].roi.toFixed(1)}% ROI
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetPerformanceChart data={analytics.performanceTrend} />
            <AssetAllocationChart data={analytics.assetAllocation} />
          </div>

          {/* Top and Underperforming Assets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Assets</CardTitle>
                <CardDescription>Highest ROI performers in your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topPerformingAssets.map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          +{asset.roi.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(asset.currentValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Needs Attention</CardTitle>
                <CardDescription>Assets that may require review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.underperformingAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-red-700">!</Badge>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {asset.roi.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(asset.currentValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <AssetPerformanceChart 
            data={analytics.performanceTrend}
            title="Detailed Performance Analysis"
            description="Comprehensive view of portfolio value, income, and expense trends"
          />
        </TabsContent>

        <TabsContent value="allocation">
          <AssetAllocationChart 
            data={analytics.assetAllocation}
            title="Portfolio Asset Allocation"
            description="Detailed breakdown of portfolio distribution by asset category"
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <AssetPerformanceHeatmap 
            assets={[...analytics.topPerformingAssets, ...analytics.underperformingAssets]}
          />
        </TabsContent>

        <TabsContent value="comparison">
          <AssetComparisonTable 
            assets={[...analytics.topPerformingAssets, ...analytics.underperformingAssets]}
            portfolioId={portfolioId}
          />
        </TabsContent>

        <TabsContent value="predictions">
          <AssetPredictiveAnalytics 
            assets={analytics.topPerformingAssets.concat(analytics.underperformingAssets).map(metric => ({
              id: metric.id,
              asset_name: metric.name,
              current_value: metric.currentValue,
              asset_value: metric.acquisitionCost,
              asset_category: { display_name: metric.category }
            } as any))}
            portfolioId={portfolioId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};