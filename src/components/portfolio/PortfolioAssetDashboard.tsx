import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Filter, Search, TrendingUp, DollarSign, Building2, BarChart3, Download, Bell, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortfolioAssets, usePortfolioAssetSummary, useAssetCategories } from '@/hooks/usePortfolioAssets';
import { AddAssetWizard } from './AddAssetWizard';
import { AssetCard } from './AssetCard';
import { AssetHierarchyView } from './AssetHierarchyView';
import { AssetRelationshipDialog } from './AssetRelationshipDialog';
import { AssetValuationDialog } from './AssetValuationDialog';
import { AssetDetailsDialog } from './AssetDetailsDialog';
import { AssetDocumentSearch } from './AssetDocumentSearch';
import { AssetAnalyticsDashboard } from './AssetAnalyticsDashboard';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { InvestmentDashboard } from '@/components/investments/InvestmentDashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useSearchParams } from 'react-router-dom';
import { useHoldingsSummary } from '@/hooks/useHoldingsSummary';
import { HoldingsKpis } from '@/components/analytics/assets/HoldingsKpis';
import { AllocationByTypeChart } from '@/components/analytics/assets/AllocationByTypeChart';
import { TopMovers } from '@/components/analytics/assets/TopMovers';
import type { PortfolioAsset } from '@/types/portfolio-assets';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { toast } from 'sonner';

interface PortfolioAssetDashboardProps {
  portfolioId: string;
  currentTab?: string;
  updateTab?: (tab: string) => void;
}

export const PortfolioAssetDashboard = ({ portfolioId, currentTab, updateTab }: PortfolioAssetDashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currency, updateCurrency } = useCurrencyPreference();
  
  const assetSymbol = searchParams.get('assetSymbol');
  const assetCategory = searchParams.get('assetCategory');
  const urlCurrency = searchParams.get('currency') as SupportedCurrency | null;
  const highlightAssetId = searchParams.get('highlightAssetId');
  const openAssetWizard = searchParams.get('openAssetWizard') === '1';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [assetSymbolFilter, setAssetSymbolFilter] = useState<string>(assetSymbol || '');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showValuationDialog, setShowValuationDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
  const [detailsDialogTab, setDetailsDialogTab] = useState<string>('overview');
  const [showWizardFromUrl, setShowWizardFromUrl] = useState(openAssetWizard);
  
  // Watch for changes in openAssetWizard URL parameter
  useEffect(() => {
    const currentOpenAssetWizard = searchParams.get('openAssetWizard') === '1';
    setShowWizardFromUrl(currentOpenAssetWizard);
  }, [searchParams]);

  const { data: assets, isLoading: assetsLoading } = usePortfolioAssets(portfolioId);
  const { data: summary, isLoading: summaryLoading } = usePortfolioAssetSummary(portfolioId);
  const { data: categories } = useAssetCategories();
  
  // Holdings summary for analytics widgets
  const { data: holdingsData, isLoading: holdingsLoading } = useHoldingsSummary(portfolioId);

  // Filter assets based on search, category, and symbol
  const filteredAssets = assets?.filter(asset => {
    const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || asset.asset_category_id === selectedCategory;
    const matchesSymbol = !assetSymbolFilter || 
                         asset.metadata?.symbol?.toLowerCase() === assetSymbolFilter.toLowerCase() ||
                         asset.asset_name.toLowerCase().includes(assetSymbolFilter.toLowerCase());
    return matchesSearch && matchesCategory && matchesSymbol;
  });

  // Group assets by category for display
  const assetsByCategory = categories?.map(category => ({
    ...category,
    assets: filteredAssets?.filter(asset => asset.asset_category_id === category.id) || []
  }));

  // Initialize currency from URL
  useEffect(() => {
    if (urlCurrency && ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'].includes(urlCurrency)) {
      updateCurrency(urlCurrency);
    }
  }, [urlCurrency, updateCurrency]);

  // Initialize category from URL
  useEffect(() => {
    if (assetCategory && categories) {
      const matchedCategory = categories.find(cat => 
        cat.display_name.toLowerCase() === assetCategory.toLowerCase()
      );
      if (matchedCategory) {
        setSelectedCategory(matchedCategory.id);
      }
    }
  }, [assetCategory, categories]);

  // Check for asset highlighting and symbol filtering from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightAssetId = params.get('highlightAssetId');
    const assetSymbol = params.get('assetSymbol');
    
    if (assetSymbol) {
      setAssetSymbolFilter(assetSymbol);
    }
    
    if (highlightAssetId && assets) {
      const assetToHighlight = assets.find(asset => asset.id === highlightAssetId);
      if (assetToHighlight) {
        // Clear the highlight param from URL
        params.delete('highlightAssetId');
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        
        // Scroll to and highlight the asset after a brief delay
        setTimeout(() => {
          const assetElement = document.querySelector(`[data-asset-id="${highlightAssetId}"]`);
          if (assetElement) {
            assetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            assetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              assetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [assets]);

  // Scroll to grid and highlight when filters are applied
  useEffect(() => {
    if ((assetSymbolFilter || selectedCategory !== 'all') && filteredAssets && filteredAssets.length > 0) {
      setTimeout(() => {
        const assetsGrid = document.querySelector('[data-assets-grid]');
        if (assetsGrid) {
          assetsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Highlight first asset
          const firstAsset = assetsGrid.querySelector('[data-asset-id]');
          if (firstAsset) {
            firstAsset.classList.add('ring-2', 'ring-primary/50', 'ring-offset-2');
            setTimeout(() => {
              firstAsset.classList.remove('ring-2', 'ring-primary/50', 'ring-offset-2');
            }, 2000);
          }
        }
      }, 100);
    }
  }, [assetSymbolFilter, selectedCategory, filteredAssets]);

  // Update currency and URL
  const handleCurrencyChange = useCallback((newCurrency: SupportedCurrency) => {
    updateCurrency(newCurrency);
    const params = new URLSearchParams(searchParams);
    params.set('currency', newCurrency);
    setSearchParams(params);
  }, [searchParams, setSearchParams, updateCurrency]);

  // Handle wizard from URL
  const handleWizardFromUrlChange = useCallback((open: boolean) => {
    setShowWizardFromUrl(open);
    if (!open) {
      const params = new URLSearchParams(searchParams);
      params.delete('openAssetWizard');
      setSearchParams(params);
    }
  }, [searchParams, setSearchParams]);

  // Clear symbol filter
  const clearSymbolFilter = useCallback(() => {
    setAssetSymbolFilter('');
    const params = new URLSearchParams(searchParams);
    params.delete('assetSymbol');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Clear category filter
  const clearCategoryFilter = useCallback(() => {
    setSelectedCategory('all');
    const params = new URLSearchParams(searchParams);
    params.delete('assetCategory');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setAssetSymbolFilter('');
    setSelectedCategory('all');
    const params = new URLSearchParams(searchParams);
    params.delete('assetSymbol');
    params.delete('assetCategory');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    window.location.reload();
    setLastRefreshTime(new Date());
    toast.success('Portfolio data refreshed');
  }, []);

  // Handle key press for filters
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (assetSymbolFilter || selectedCategory !== 'all')) {
        clearAllFilters();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [assetSymbolFilter, selectedCategory, clearAllFilters]);

  // Generate CSV export
  const handleExportCSV = useCallback(() => {
    if (!filteredAssets || filteredAssets.length === 0) {
      toast.error('No assets to export');
      return;
    }

    const headers = [
      'Name', 'Category', 'Type', 'Symbol', 'Market Value', 'Cost Basis', 
      'Annual Income', 'Tags', 'Last Updated'
    ];

    const csvContent = [
      `Portfolio Assets Export - ${new Date().toLocaleDateString()}`,
      `Selected Currency: ${currency}`,
      `Total Assets: ${filteredAssets.length}`,
      '',
      headers.join(','),
      ...filteredAssets.map(asset => [
        `"${asset.asset_name}"`,
        `"${categories?.find(c => c.id === asset.asset_category_id)?.display_name || 'Unknown'}"`,
        `"${asset.asset_description || 'Unknown'}"`,
        `"${asset.metadata?.symbol || 'N/A'}"`,
        asset.current_value || 0,
        asset.current_value || 0,
        asset.annual_income || 0,
        `"${asset.tags?.join('; ') || 'None'}"`,
        asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio-assets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Portfolio assets exported to CSV');
  }, [filteredAssets, currency, categories]);

  // Navigate to alerts
  const handleManageAlerts = useCallback(() => {
    const alertsUrl = `/alerts${assetSymbolFilter ? `?symbol=${assetSymbolFilter}` : ''}`;
    window.open(alertsUrl, '_blank');
  }, [assetSymbolFilter]);

  const isLoading = assetsLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Currency Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfolio Assets</h2>
          <p className="text-muted-foreground">
            Manage and analyze your portfolio assets
          </p>
          {(assetSymbolFilter || selectedCategory !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {assetSymbolFilter && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  Symbol: {assetSymbolFilter}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    onClick={clearSymbolFilter}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  Category: {categories?.find(c => c.id === selectedCategory)?.display_name}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    onClick={clearCategoryFilter}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>
          )}
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
            onClick={handleRefresh}
            size="sm"
            className="bg-white text-openkey-blue border border-openkey-blue hover:bg-white hover:text-openkey-blue"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_assets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CurrencyDisplay
                amount={summary.total_value}
                currency={currency}
                variant="large"
                className="text-2xl font-bold"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CurrencyDisplay
                amount={summary.total_annual_income}
                currency={currency}
                variant="large"
                className="text-2xl font-bold text-green-600"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CurrencyDisplay
                amount={summary.net_annual_income}
                currency={currency}
                variant="large"
                className={`text-2xl font-bold ${summary.net_annual_income >= 0 ? 'text-green-600' : 'text-red-600'}`}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AddAssetWizard 
          portfolioId={portfolioId}
          trigger={
            <Button className="bg-white text-openkey-blue border-0 hover:bg-white hover:text-openkey-blue">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          }
        />
        
        {/* Auto-open wizard from URL */}
        {showWizardFromUrl && (
          <AddAssetWizard
            portfolioId={portfolioId}
            isOpen={showWizardFromUrl}
            onOpenChange={handleWizardFromUrlChange}
          />
        )}
      </div>

      {/* Asset Display */}
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex items-center gap-4 mb-4">
          <TabsList className="flex h-12 w-full bg-card border border-openkey-blue/20 rounded-lg p-1 shadow-md">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            disabled={!filteredAssets || filteredAssets.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <TabsContent value="grid" className="space-y-4">
          {filteredAssets && filteredAssets.length > 0 ? (
            <div id="assets-grid" data-assets-grid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} data-asset-id={asset.id} className="transition-all duration-300">
                  <AssetCard 
                    asset={asset}
                    onViewDetails={(assetId, tab = 'overview') => {
                      const foundAsset = filteredAssets.find(a => a.id === assetId);
                      if (foundAsset) {
                        setSelectedAsset(foundAsset);
                        setDetailsDialogTab(tab);
                        setShowDetailsDialog(true);
                      }
                    }}
                    onEdit={(assetId) => {
                      const foundAsset = filteredAssets.find(a => a.id === assetId);
                      if (foundAsset) {
                        setSelectedAsset(foundAsset);
                        setShowValuationDialog(true);
                      }
                    }}
                    onValuation={(assetId) => {
                      const foundAsset = filteredAssets.find(a => a.id === assetId);
                      if (foundAsset) {
                        setSelectedAsset(foundAsset);
                        setShowValuationDialog(true);
                      }
                    }}
                    onRelationships={(assetId) => {
                      const foundAsset = filteredAssets.find(a => a.id === assetId);
                      if (foundAsset) {
                        setSelectedAsset(foundAsset);
                        setShowRelationshipDialog(true);
                      }
                    }}
                    onInvite={(assetId) => {
                      const foundAsset = filteredAssets.find(a => a.id === assetId);
                      if (foundAsset) {
                        setSelectedAsset(foundAsset);
                        setDetailsDialogTab('invitations');
                        setShowDetailsDialog(true);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || selectedCategory !== 'all' || assetSymbolFilter
                    ? "No assets match your current filters." 
                    : "Start building your portfolio by adding your first asset."}
                </p>
                <AddAssetWizard 
                  portfolioId={portfolioId}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Asset
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="category" className="space-y-6">
          {assetsByCategory?.map(category => (
            <div key={category.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{category.display_name}</h2>
                  <Badge variant="secondary">{category.assets.length}</Badge>
                </div>
                {summary && (
                  <div className="text-sm text-muted-foreground">
                    <CurrencyDisplay
                      amount={summary.asset_categories.find(c => c.category_id === category.id)?.total_value || 0}
                      currency={currency}
                      variant="compact"
                    />
                  </div>
                )}
              </div>
              
              {category.assets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.assets.map(asset => (
                    <div key={asset.id} data-asset-id={asset.id} className="transition-all duration-300">
                      <AssetCard 
                        asset={asset}
                        onViewDetails={(assetId, tab = 'overview') => {
                          const foundAsset = category.assets.find(a => a.id === assetId);
                          if (foundAsset) {
                            setSelectedAsset(foundAsset);
                            setDetailsDialogTab(tab);
                            setShowDetailsDialog(true);
                          }
                        }}
                        onEdit={(assetId) => {
                          const foundAsset = category.assets.find(a => a.id === assetId);
                          if (foundAsset) {
                            setSelectedAsset(foundAsset);
                            setShowValuationDialog(true);
                          }
                        }}
                        onValuation={(assetId) => {
                          const foundAsset = category.assets.find(a => a.id === assetId);
                          if (foundAsset) {
                            setSelectedAsset(foundAsset);
                            setShowValuationDialog(true);
                          }
                        }}
                        onRelationships={(assetId) => {
                          const foundAsset = category.assets.find(a => a.id === assetId);
                          if (foundAsset) {
                            setSelectedAsset(foundAsset);
                            setShowRelationshipDialog(true);
                          }
                        }}
                        onInvite={(assetId) => {
                          const foundAsset = category.assets.find(a => a.id === assetId);
                          if (foundAsset) {
                            setSelectedAsset(foundAsset);
                            setDetailsDialogTab('invitations');
                            setShowDetailsDialog(true);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-6">
                    <p className="text-muted-foreground">
                      No {category.display_name.toLowerCase()} assets yet
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="hierarchy">
          <AssetHierarchyView
            portfolioId={portfolioId}
            onCreateRelationship={(asset) => {
              setSelectedAsset(asset);
              setShowRelationshipDialog(true);
            }}
            onRecordValuation={(asset) => {
              setSelectedAsset(asset);
              setShowValuationDialog(true);
            }}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Analytics widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AllocationByTypeChart
                data={holdingsData?.allocation_by_type || {}}
                isLoading={holdingsLoading}
                currency={currency}
                onCategoryClick={(categoryName) => {
                  // Update the category filter and URL
                  const params = new URLSearchParams(searchParams);
                  params.set('assetCategory', categoryName);
                  setSearchParams(params);
                  
                  // Find matching category
                  const matchedCategory = categories?.find(cat => 
                    cat.display_name.toLowerCase() === categoryName.toLowerCase()
                  );
                  if (matchedCategory) {
                    setSelectedCategory(matchedCategory.id);
                  }
                  
                  // Switch to grid view and scroll to assets
                  setTimeout(() => {
                    const gridTab = document.querySelector('[data-state="inactive"][value="grid"]') as HTMLElement;
                    if (gridTab) {
                      gridTab.click();
                    }
                  }, 100);
                }}
              />
              <TopMovers
                topMovers={(holdingsData?.top_movers || []).map((mover: any) => ({
                  symbol: mover.symbol,
                  change_percent: mover.change_percent,
                  timeframe: mover.timeframe,
                  current_price: mover.current_price,
                  quantity: mover.quantity,
                  total_value: mover.total_value,
                  acquisition_cost: mover.acquisition_cost,
                  gain_loss_amount: mover.gain_loss_amount,
                  asset_type: mover.asset_type
                }))}
                isLoading={holdingsLoading}
              />
            </div>
            <AssetAnalyticsDashboard portfolioId={portfolioId} />
          </div>
        </TabsContent>

        <TabsContent value="investments">
          <InvestmentDashboard portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="documents">
          <AssetDocumentSearch 
            portfolioId={portfolioId}
            onDocumentSelect={(documentId) => {
              console.log('Document selected:', documentId);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Relationship and Valuation Dialogs */}
      {selectedAsset && (
        <>
          <AssetRelationshipDialog
            isOpen={showRelationshipDialog}
            onClose={() => {
              setShowRelationshipDialog(false);
              setSelectedAsset(null);
            }}
            portfolioId={portfolioId}
            parentAsset={selectedAsset}
          />

          <AssetValuationDialog
            isOpen={showValuationDialog}
            onClose={() => {
              setShowValuationDialog(false);
              setSelectedAsset(null);
            }}
            asset={selectedAsset}
            portfolioId={portfolioId}
          />

          <AssetDetailsDialog
            isOpen={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedAsset(null);
            }}
            asset={selectedAsset}
            defaultTab={detailsDialogTab}
            portfolioId={portfolioId}
          />
        </>
      )}
    </div>
  );
};