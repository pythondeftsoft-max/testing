import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedPortfolioAssets } from '@/hooks/useAdvancedPortfolioAssets';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import HoldingsMetrics from '@/components/portfolio/HoldingsMetrics';
import HoldingsAllocationChart from '@/components/portfolio/HoldingsAllocationChart';
import AssetTable from '@/components/portfolio/AssetTable';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, DollarSign, PieChart, Download, Bell, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssetInviteButton from '@/components/AssetInviteButton';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { AllocationByTypeChart } from '@/components/analytics/assets/AllocationByTypeChart';
import { TopMovers } from '@/components/analytics/assets/TopMovers';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { toast } from 'sonner';

const PortfolioHoldings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const { toast: toastHook } = useToast();
  const { currency, updateCurrency } = useCurrencyPreference();
  
  const urlCurrency = searchParams.get('currency') as SupportedCurrency | null;

  // Initialize currency from URL
  useEffect(() => {
    if (urlCurrency && ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'].includes(urlCurrency)) {
      updateCurrency(urlCurrency);
    }
  }, [urlCurrency, updateCurrency]);

  // Update currency and URL
  const handleCurrencyChange = useCallback((newCurrency: SupportedCurrency) => {
    updateCurrency(newCurrency);
    const params = new URLSearchParams(searchParams);
    params.set('currency', newCurrency);
    setSearchParams(params);
  }, [searchParams, setSearchParams, updateCurrency]);

  // Get portfolio from URL params
  useEffect(() => {
    const portfolioId = searchParams.get('portfolioId');
    if (portfolioId) {
      setSelectedPortfolio(portfolioId);
    }
  }, [searchParams]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch portfolio data
  const portfolioIdParam = selectedPortfolio === 'everything' ? undefined : selectedPortfolio;
  const { 
    assets, 
    holdingsSummary, 
    isLoading, 
    error, 
    refreshData 
  } = useAdvancedPortfolioAssets(portfolioIdParam);

  const handleRefresh = async () => {
    try {
      await refreshData();
      setLastRefreshTime(new Date());
      toast.success('Portfolio data refreshed');
    } catch (error) {
      toast.error('Failed to refresh portfolio data');
    }
  };

  // Navigate to alerts
  const handleManageAlerts = useCallback(() => {
    window.open('/alerts', '_blank');
  }, []);

  // Generate CSV export
  const handleExportCSV = useCallback(() => {
    if (!assets || assets.length === 0) {
      toast.error('No assets to export');
      return;
    }

    const headers = [
      'Name', 'Symbol', 'Market Value', 'Shares', 'Cost Basis', 
      'Change %', 'Change $', 'Last Updated'
    ];

    const csvContent = [
      `Portfolio Holdings Export - ${new Date().toLocaleDateString()}`,
      `Selected Currency: ${currency}`,
      `Portfolio: ${selectedPortfolio === 'everything' ? 'All Portfolios' : selectedPortfolio}`,
      `Total Assets: ${assets.length}`,
      '',
      headers.join(','),
      ...assets.map(asset => [
        `"${asset.asset_name || 'Unknown'}"`,
        `"${(asset as any).symbol || 'N/A'}"`,
        asset.current_value || 0,
        (asset as any).quantity || 1,
        asset.current_value || 0,
        ((asset as any).change_24h || 0),
        ((asset as any).change_amount || 0),
        asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `holdings-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Holdings exported to CSV');
  }, [assets, currency, selectedPortfolio]);

  const handlePortfolioChange = (portfolioId: string) => {
    setSelectedPortfolio(portfolioId);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle-blue">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gradient-blue-gold">
              Portfolio Holdings
            </h1>
            <p className="text-muted-foreground">
              Track your investments and market performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last refreshed: {lastRefreshTime.toLocaleTimeString()}
            </div>
            <CurrencySelector
              value={currency}
              onValueChange={handleCurrencyChange}
              showIcon={false}
              className="w-fit"
            />
            <Button
              onClick={handleManageAlerts}
              variant="outline"
              size="sm"
            >
              <Bell className="h-4 w-4 mr-2" />
              Manage Alerts
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={!assets || assets.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Portfolio Selector */}
        <CardEnhanced className="p-6">
          <PortfolioSelectorDropdown
            selectedPortfolio={selectedPortfolio}
            onPortfolioChange={handlePortfolioChange}
            userId={userId}
          />
        </CardEnhanced>

        {/* Error State */}
        {error && (
          <CardEnhanced className="p-6 border-destructive bg-destructive/5">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-destructive mb-2">Failed to load portfolio data</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
                
                {error.includes('permission') && (
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="secondary" 
                    size="sm"
                  >
                    Refresh Page
                  </Button>
                )}
              </div>
              
              {error.includes('permission') && (
                <p className="text-xs text-muted-foreground mt-3 max-w-sm mx-auto">
                  If this persists, you may need to be granted access to this portfolio.
                </p>
              )}
            </div>
          </CardEnhanced>
        )}

        {/* Loading State */}
        {isLoading && !assets?.length && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <CardEnhanced key={i} className="p-6 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardEnhanced>
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Metrics Section */}
            <HoldingsMetrics 
              summary={holdingsSummary as any}
              isLoading={isLoading}
            />

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Analytics widgets */}
              <AllocationByTypeChart
                data={holdingsSummary?.allocationByType || {}}
                isLoading={isLoading}
                currency={currency}
                onCategoryClick={(categoryName) => {
                  // Navigate to assets page with category filter
                  const assetsUrl = `/dashboard?tab=assets&assetCategory=${categoryName}&currency=${currency}`;
                  window.location.href = assetsUrl;
                }}
              />
              <TopMovers
                topMovers={(holdingsSummary?.topMovers || []).map(mover => ({
                  symbol: mover.symbol,
                  change_percent: mover.changePercent,
                  timeframe: mover.timeframe,
                  current_price: mover.currentPrice,
                  quantity: mover.quantity,
                  total_value: mover.totalValue,
                  acquisition_cost: mover.acquisitionCost,
                  gain_loss_amount: mover.gainLossAmount,
                  asset_type: mover.assetType
                }))}
                isLoading={isLoading}
                currency={currency}
              />
            </div>

            {/* Asset Table */}
            <div className="grid grid-cols-1 gap-6">
              <CardEnhanced className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Holdings</h3>
                    <span className="text-sm text-muted-foreground">
                      {assets?.length || 0} assets
                    </span>
                  </div>
                  
                  {/* Add invitation button in assets header */}
                  {assets && assets.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Use "Invite to Pay" on individual assets to collect rent
                    </div>
                  )}
                </div>
                <AssetTable 
                  assets={assets || []}
                  isLoading={isLoading}
                />
              </CardEnhanced>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!assets || assets.length === 0) && (
          <CardEnhanced className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Assets Found</h3>
                <p className="text-muted-foreground">
                  {selectedPortfolio === 'everything' 
                    ? "You don't have any assets in your portfolios yet."
                    : "This portfolio doesn't contain any assets yet."
                  }
                </p>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                Refresh Data
              </Button>
            </div>
          </CardEnhanced>
        )}
      </div>
    </div>
  );
};

export default PortfolioHoldings;