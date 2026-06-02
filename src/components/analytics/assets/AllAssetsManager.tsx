import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Plus, Building2, TrendingUp, TrendingDown, Eye, RefreshCw, Clock, Bell, BellOff, Columns, CheckSquare, Square, Tag, FolderOpen, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUserAssets, type UserAsset } from '@/hooks/useUserAssets';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { CurrencySelector } from '@/components/ui/currency-selector';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AssetOnboardingEmptyState } from './AssetOnboardingEmptyState';
import { AssetBulkOperations } from './AssetBulkOperations';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import { useHoldingsSummary } from '@/hooks/useHoldingsSummary';
import { usePortfolioMarketData } from '@/hooks/usePortfolioMarketData';
import { HoldingsKpis } from '@/components/analytics/assets/HoldingsKpis';
import { AssetDetailsDrawer } from '@/components/portfolio/AssetDetailsDrawer';
import PriceSparkline from '@/components/portfolio/PriceSparkline';
import { MarketAlertsManager } from '@/components/analytics/assets/MarketAlertsManager';
import { useMarketAlerts, useEvaluateMarketAlerts } from '@/hooks/useMarketAlerts';
import { supabase } from '@/integrations/supabase/client';

interface AllAssetsManagerProps {
  userId: string;
}

// Table preferences interface
interface TablePreferences {
  visibleColumns: string[];
  sortBy: 'name' | 'value' | 'updated';
  sortOrder: 'asc' | 'desc';
  autoRefreshInterval: number;
}

const defaultTablePreferences: TablePreferences = {
  visibleColumns: ['name', 'category', 'price', 'change24h', 'trend', 'marketValue', 'costBasis', 'unrealizedPL', 'annualIncome', 'tags', 'actions'],
  sortBy: 'updated',
  sortOrder: 'desc',
  autoRefreshInterval: 0,
};

const availableColumns = [
  { id: 'name', label: 'Name', required: true },
  { id: 'category', label: 'Category' },
  { id: 'price', label: 'Price' },
  { id: 'change24h', label: '24h %' },
  { id: 'trend', label: 'Trend' },
  { id: 'marketValue', label: 'Market Value' },
  { id: 'costBasis', label: 'Cost Basis' },
  { id: 'unrealizedPL', label: 'Unrealized P/L' },
  { id: 'annualIncome', label: 'Annual Income' },
  { id: 'tags', label: 'Tags' },
  { id: 'actions', label: 'Actions', required: true },
];

export const AllAssetsManager = ({ userId }: AllAssetsManagerProps) => {
  const { data: assets, isLoading, error, refetch } = useUserAssets(userId);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currency, updateCurrency } = useCurrencyPreference();
  
  const openAssetWizard = searchParams.get('openAssetWizard') === '1';
  const [showWizardFromUrl, setShowWizardFromUrl] = useState(openAssetWizard);
  
  // Watch for changes in openAssetWizard URL parameter
  useEffect(() => {
    const currentOpenAssetWizard = searchParams.get('openAssetWizard') === '1';
    setShowWizardFromUrl(currentOpenAssetWizard);
  }, [searchParams]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [assetSymbolFilter, setAssetSymbolFilter] = useState<string>('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null);
  const [showAlertsManager, setShowAlertsManager] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string>('');
  
  // Bulk selection state
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [bulkUpdateInProgress, setBulkUpdateInProgress] = useState(false);
  
  // Table preferences with localStorage persistence
  const [tablePreferences, setTablePreferences] = useState<TablePreferences>(() => {
    try {
      const saved = localStorage.getItem('assets-table-preferences');
      return saved ? { ...defaultTablePreferences, ...JSON.parse(saved) } : defaultTablePreferences;
    } catch {
      return defaultTablePreferences;
    }
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('assets-table-preferences', JSON.stringify(tablePreferences));
  }, [tablePreferences]);

  // Check for asset symbol and category filtering from URL params
  useEffect(() => {
    const assetSymbol = searchParams.get('assetSymbol');
    const assetCategory = searchParams.get('assetCategory');
    const urlCurrency = searchParams.get('currency');
    
    if (assetSymbol) {
      setAssetSymbolFilter(assetSymbol);
    }
    
    if (assetCategory) {
      setAssetCategoryFilter(assetCategory);
    }
    
    if (urlCurrency && ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'].includes(urlCurrency)) {
      updateCurrency(urlCurrency as any);
    }
  }, [searchParams, updateCurrency]);

  // Handle keyboard events for clearing filters
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (assetSymbolFilter || assetCategoryFilter) {
          clearAllFilters();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [assetSymbolFilter, assetCategoryFilter]);

  // Extract individual preferences for easier use
  const { visibleColumns, sortBy, sortOrder, autoRefreshInterval } = tablePreferences;

  // Fetch holdings summary, market data, and alerts
  const { data: holdingsSummary, isLoading: isHoldingsLoading } = useHoldingsSummary(undefined, userId);
  const { 
    data: marketData, 
    isLoading: isMarketLoading, 
    refetch: refetchMarketData 
  } = usePortfolioMarketData(assets, { 
    refetchInterval: autoRefreshInterval * 1000, // Convert to milliseconds
    enabled: Boolean(assets?.length)
  });
  const { data: alerts = [] } = useMarketAlerts(userId);
  const evaluateAlertsMutation = useEvaluateMarketAlerts();

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!assets) return [];
    const uniqueCategories = Array.from(
      new Set(assets.map(asset => asset.category_display_name))
    );
    return uniqueCategories.map(name => {
      const asset = assets.find(a => a.category_display_name === name);
      return {
        name,
        id: asset?.asset_category_id || '',
        color: asset?.category_color_theme || 'blue'
      };
    });
  }, [assets]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    if (!assets) return [];

    let filtered = assets.filter(asset => {
      const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.asset_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
                             asset.category_display_name === selectedCategory;
      
      const matchesType = selectedType === 'all' || 
                         asset.metadata?.asset_type === selectedType;
      
      const matchesSymbol = !assetSymbolFilter || 
                           asset.metadata?.symbol?.toLowerCase() === assetSymbolFilter.toLowerCase() ||
                           asset.asset_name.toLowerCase().includes(assetSymbolFilter.toLowerCase());
      
      const matchesCategoryFilter = !assetCategoryFilter || 
                                   asset.category_display_name.toLowerCase() === assetCategoryFilter.toLowerCase();
      
      return matchesSearch && matchesCategory && matchesType && matchesSymbol && matchesCategoryFilter;
    });

    // Sort assets
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.asset_name.localeCompare(b.asset_name);
          break;
        case 'value':
          const aValue = a.current_value || a.asset_value || 0;
          const bValue = b.current_value || b.asset_value || 0;
          comparison = aValue - bValue;
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [assets, searchTerm, selectedCategory, selectedType, sortBy, sortOrder]);

  // Update selection state when filtered assets change
  useEffect(() => {
    const currentSelection = selectedAssets.filter(id => 
      filteredAndSortedAssets.some(asset => asset.id === id)
    );
    setSelectedAssets(currentSelection);
    setIsAllSelected(currentSelection.length === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0);
  }, [filteredAndSortedAssets, assetSymbolFilter, assetCategoryFilter]);

  // Auto-scroll to filtered assets when symbol or category filter is applied
  useEffect(() => {
    if (assetSymbolFilter || assetCategoryFilter) {
      setTimeout(() => {
        const assetsGrid = document.getElementById('assets-grid');
        if (assetsGrid) {
          assetsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Highlight first matching row if symbol filter is active
        if (assetSymbolFilter && filteredAndSortedAssets.length > 0) {
          const firstAsset = filteredAndSortedAssets[0];
          const assetRow = document.querySelector(`[data-asset-id="${firstAsset.id}"]`);
          if (assetRow) {
            assetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            assetRow.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              assetRow.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 3000);
          }
        }
      }, 100);
    }
  }, [assetSymbolFilter, assetCategoryFilter, filteredAndSortedAssets]);

  // Helper function to check if asset has alerts
  const hasAlert = (symbol: string) => {
    return alerts.some(alert => alert.symbol === symbol && alert.is_active);
  };

  // Clear filters
  const clearAllFilters = () => {
    setAssetSymbolFilter('');
    setAssetCategoryFilter('');
    const params = new URLSearchParams(searchParams);
    params.delete('assetSymbol');
    params.delete('assetCategory');
    setSearchParams(params);
  };

  const clearSymbolFilter = () => {
    setAssetSymbolFilter('');
    const params = new URLSearchParams(searchParams);
    params.delete('assetSymbol');
    setSearchParams(params);
  };

  const clearCategoryFilter = () => {
    setAssetCategoryFilter('');
    const params = new URLSearchParams(searchParams);
    params.delete('assetCategory');
    setSearchParams(params);
  };

  // Update currency in URL when changed
  const handleCurrencyChange = (newCurrency: any) => {
    updateCurrency(newCurrency);
    const params = new URLSearchParams(searchParams);
    params.set('currency', newCurrency);
    setSearchParams(params);
  };

  // Handle wizard from URL
  const handleWizardFromUrlChange = (open: boolean) => {
    setShowWizardFromUrl(open);
    if (!open) {
      const params = new URLSearchParams(searchParams);
      params.delete('openAssetWizard');
      setSearchParams(params);
    }
  };

  const handleExport = async () => {
    if (!filteredAndSortedAssets.length) {
      toast({
        title: "No Data to Export",
        description: "No assets match your current filters.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const csvHeaders = [
        'Name',
        'Category', 
        'Type',
        'Symbol',
        'Market Value',
        'Cost Basis',
        'Annual Income',
        'Tags',
        'Portfolio',
        'Last Updated'
      ];

      // Add currency info header
      const currencyHeader = `Selected Currency: ${currency}`;

      const csvData = filteredAndSortedAssets.map(asset => [
        asset.asset_name,
        asset.category_display_name,
        asset.metadata?.asset_type || 'N/A',
        asset.metadata?.symbol || 'N/A',
        `"${formatCurrency(asset.current_value || asset.asset_value || 0, currency)}"`,
        `"${formatCurrency(asset.acquisition_cost || 0, currency)}"`,
        `"${formatCurrency(asset.annual_income || 0, currency)}"`,
        asset.tags.join('; '),
        'Portfolio', // We'd need portfolio name from the portfolio_id
        new Date(asset.updated_at).toLocaleDateString()
      ]);

      const csv = [currencyHeader, csvHeaders.join(','), ...csvData.map(row => row.join(','))]
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-assets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredAndSortedAssets.length} assets to CSV.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getValueChange = (asset: UserAsset) => {
    const shares = asset.metadata?.shares ? Number(asset.metadata.shares) : 1;
    const symbol = asset.metadata?.symbol as string;
    const assetMarketData = symbol && marketData?.[symbol];
    
    // Use market data if available, otherwise fallback to stored values
    const currentValue = assetMarketData ? assetMarketData.currentPrice * shares : (asset.current_value || asset.asset_value || 0);
    const costBasis = asset.acquisition_cost || asset.asset_value || 0;
    
    if (costBasis === 0) return null;
    
    const change = currentValue - costBasis;
    const changePercent = (change / costBasis) * 100;
    
    return { change, changePercent, currentValue };
  };

  const handleRefreshQuotes = async () => {
    try {
      await refetchMarketData();
      
      // Evaluate alerts after market data refresh
      if (marketData) {
        const observations = Object.entries(marketData).reduce((acc, [symbol, data]) => {
          acc[symbol] = {
            price: data.currentPrice,
            changePct24h: data.priceChangePercentage24h
          };
          return acc;
        }, {} as Record<string, { price: number; changePct24h?: number }>);
        
        evaluateAlertsMutation.mutate(observations);
      }
      
      toast({
        title: "Quotes Updated",
        description: "Market data has been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to update market data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAutoRefreshToggle = () => {
    const intervals = [0, 60, 120]; // 0 = off, 60 = 1min, 120 = 2min
    const currentIndex = intervals.indexOf(autoRefreshInterval);
    const nextInterval = intervals[(currentIndex + 1) % intervals.length];
    
    setTablePreferences(prev => ({ ...prev, autoRefreshInterval: nextInterval }));
    
    toast({
      title: nextInterval === 0 ? "Auto-refresh Disabled" : "Auto-refresh Enabled",
      description: nextInterval === 0 ? "Market data will not auto-refresh" : `Market data will refresh every ${nextInterval}s`,
    });
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(filteredAndSortedAssets.map(asset => asset.id));
      setIsAllSelected(true);
    } else {
      setSelectedAssets([]);
      setIsAllSelected(false);
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    let newSelection: string[];
    if (checked) {
      newSelection = [...selectedAssets, assetId];
    } else {
      newSelection = selectedAssets.filter(id => id !== assetId);
    }
    setSelectedAssets(newSelection);
    setIsAllSelected(newSelection.length === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0);
  };

  // Bulk operations
  const handleBulkAddTags = async (tags: string[]) => {
    if (selectedAssets.length === 0) return;
    
    setBulkUpdateInProgress(true);
    try {
      const updates = selectedAssets.map(assetId => {
        const asset = assets?.find(a => a.id === assetId);
        if (!asset) return null;
        
        const existingTags = asset.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates
        
        return supabase
          .from('portfolio_assets')
          .update({ tags: newTags })
          .eq('id', assetId);
      }).filter(Boolean);

      await Promise.all(updates);
      await refetch();
      
      toast({
        title: "Tags Added",
        description: `Added tags to ${selectedAssets.length} asset${selectedAssets.length > 1 ? 's' : ''}`,
      });
      
      setSelectedAssets([]);
      setIsAllSelected(false);
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to add tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdateInProgress(false);
    }
  };

  const handleBulkChangeCategory = async (categoryId: string) => {
    if (selectedAssets.length === 0) return;
    
    setBulkUpdateInProgress(true);
    try {
      const updates = selectedAssets.map(assetId => 
        supabase
          .from('portfolio_assets')
          .update({ asset_category_id: categoryId })
          .eq('id', assetId)
      );

      await Promise.all(updates);
      await refetch();
      
      toast({
        title: "Category Updated",
        description: `Updated category for ${selectedAssets.length} asset${selectedAssets.length > 1 ? 's' : ''}`,
      });
      
      setSelectedAssets([]);
      setIsAllSelected(false);
    } catch (error) {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkUpdateInProgress(false);
    }
  };

  // Table preferences handlers
  const handleSortChange = (newSortBy: 'name' | 'value' | 'updated') => {
    setTablePreferences(prev => ({
      ...prev,
      sortBy: newSortBy,
      sortOrder: prev.sortBy === newSortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleColumnToggle = (columnId: string, visible: boolean) => {
    setTablePreferences(prev => ({
      ...prev,
      visibleColumns: visible 
        ? [...prev.visibleColumns, columnId]
        : prev.visibleColumns.filter(id => id !== columnId)
    }));
  };

  // Alert creation helper
  const handleCreateAlert = (symbol: string, assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity') => {
    setAlertSymbol(symbol);
    setShowAlertsManager(true);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Unable to load assets. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" id="assets-grid">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Assets Manager</h2>
          <p className="text-muted-foreground">
            Unified view of all your assets across portfolios
          </p>
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            {assetSymbolFilter && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  Symbol: {assetSymbolFilter}
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSymbolFilter}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {assetCategoryFilter && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  Category: {assetCategoryFilter}
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearCategoryFilter}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {(assetSymbolFilter || assetCategoryFilter) && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector
            value={currency}
            onValueChange={handleCurrencyChange}
            showIcon={false}
            className="w-fit"
          />
          <Button 
            onClick={handleRefreshQuotes}
            disabled={isMarketLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isMarketLoading && "animate-spin")} />
            Refresh Quotes
          </Button>
          <Button 
            onClick={handleAutoRefreshToggle}
            variant={autoRefreshInterval > 0 ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Auto: {autoRefreshInterval === 0 ? 'Off' : `${autoRefreshInterval}s`}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {availableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={(checked) => handleColumnToggle(column.id, checked)}
                  disabled={column.required}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setShowAlertsManager(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            Alerts ({alerts.filter(a => a.is_active).length})
          </Button>
          <AddAssetWizard 
            portfolioId="everything" 
            onAssetAdded={refetch}
            trigger={
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            }
          />
          
          {/* Auto-open wizard from URL */}
          {showWizardFromUrl && (
            <AddAssetWizard
              portfolioId="everything"
              isOpen={showWizardFromUrl}
              onOpenChange={handleWizardFromUrlChange}
              onAssetAdded={refetch}
            />
          )}
          <Button 
            onClick={handleExport}
            disabled={isExporting || !filteredAndSortedAssets.length}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Holdings Summary */}
      {holdingsSummary && (
        <HoldingsKpis data={holdingsSummary} isLoading={isHoldingsLoading} />
      )}

      {/* Bulk Operations Bar */}
      <AssetBulkOperations
        selectedAssets={selectedAssets}
        onClearSelection={() => setSelectedAssets([])}
        onAssetsUpdated={() => refetch()}
      />

      {/* Filters and Bulk Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search assets, descriptions, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="value">Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedAssets.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium">
              {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkUpdateInProgress}>
                    <Tag className="h-4 w-4 mr-2" />
                    Add Tags
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAddTags(['growth'])}>
                    Growth
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAddTags(['dividend'])}>
                    Dividend
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAddTags(['speculative'])}>
                    Speculative
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAddTags(['blue-chip'])}>
                    Blue Chip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkUpdateInProgress}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Change Category
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map(category => (
                    <DropdownMenuItem 
                      key={category.id}
                      onClick={() => handleBulkChangeCategory(category.id)}
                    >
                      {category.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedAssets([]);
                  setIsAllSelected(false);
                }}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Assets Table */}
      <Card className="card-elevated border-openkey-blue/20 bg-gradient-subtle-blue/30 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedAssets.length === 0 ? (
            <AssetOnboardingEmptyState
              portfolioId="everything"
              onAssetAdded={refetch}
              isFiltered={!!(searchTerm || selectedCategory !== 'all')}
              filterDescription={
                searchTerm 
                  ? `No assets match "${searchTerm}"`
                  : selectedCategory !== 'all'
                  ? `No assets in ${selectedCategory} category`
                  : undefined
              }
            />
          ) : (
          <Table>
            <TableHeader className="bg-openkey-blue/5">
              <TableRow className="border-openkey-blue/20 hover:bg-openkey-blue/10">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all assets"
                    />
                  </TableHead>
                  {visibleColumns.includes('name') && <TableHead>Name</TableHead>}
                  {visibleColumns.includes('category') && <TableHead>Category</TableHead>}
                  {visibleColumns.includes('price') && <TableHead>Price</TableHead>}
                  {visibleColumns.includes('change24h') && <TableHead>24h %</TableHead>}
                  {visibleColumns.includes('trend') && <TableHead>Trend</TableHead>}
                  {visibleColumns.includes('marketValue') && <TableHead className="text-right">Market Value</TableHead>}
                  {visibleColumns.includes('costBasis') && <TableHead className="text-right">Cost Basis</TableHead>}
                  {visibleColumns.includes('unrealizedPL') && <TableHead className="text-right">Unrealized P/L</TableHead>}
                  {visibleColumns.includes('annualIncome') && <TableHead className="text-right">Annual Income</TableHead>}
                  {visibleColumns.includes('tags') && <TableHead>Tags</TableHead>}
                  {visibleColumns.includes('actions') && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredAndSortedAssets.map((asset) => {
                   const valueChange = getValueChange(asset);
                   const symbol = asset.metadata?.symbol as string;
                   const assetMarketData = symbol && marketData?.[symbol];
                   
                   return (
                      <TableRow key={asset.id} data-asset-id={asset.id} className="cursor-pointer transition-all duration-200 hover:bg-openkey-gold/5 border-b border-openkey-blue/10 group" onClick={() => setSelectedAsset(asset)}>
                       <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                         <Checkbox
                           checked={selectedAssets.includes(asset.id)}
                           onCheckedChange={(checked) => handleSelectAsset(asset.id, checked as boolean)}
                           aria-label={`Select ${asset.asset_name}`}
                           className="border-openkey-blue/50 data-[state=checked]:bg-openkey-blue data-[state=checked]:border-openkey-blue"
                         />
                       </TableCell>
                       {visibleColumns.includes('name') && (
                         <TableCell className="font-medium">
                           <div className="flex items-center space-x-3">
                             <div className="flex-shrink-0">
                               <div className="w-10 h-10 rounded-lg bg-gradient-blue-gold flex items-center justify-center text-sm font-bold text-white shadow-md group-hover:shadow-lg transition-shadow">
                                 {asset.asset_name.substring(0, 2).toUpperCase()}
                               </div>
                             </div>
                             <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2">
                                 <p className="text-sm font-semibold text-openkey-blue truncate group-hover:text-openkey-blue-light transition-colors">
                                   {asset.asset_name}
                                 </p>
                                 {symbol && hasAlert(symbol) && (
                                   <div title="Has active alerts">
                                     <Bell className="h-3 w-3 text-openkey-gold animate-pulse" />
                                   </div>
                                 )}
                               </div>
                               {asset.asset_description && (
                                 <p className="text-xs text-muted-foreground truncate max-w-48">
                                   {asset.asset_description}
                                 </p>
                               )}
                               {symbol && (
                                 <p className="text-xs text-openkey-gold font-medium">{symbol}</p>
                               )}
                             </div>
                           </div>
                         </TableCell>
                       )}
                       {visibleColumns.includes('category') && (
                         <TableCell>
                           <Badge 
                             variant="secondary" 
                             className="bg-openkey-blue/10 text-openkey-blue border-openkey-blue/20 hover:bg-openkey-blue/20 transition-colors group-hover:scale-105"
                           >
                             {asset.category_display_name}
                           </Badge>
                         </TableCell>
                       )}
                      {visibleColumns.includes('price') && (
                        <TableCell className="text-right">
                           {assetMarketData ? (
                             <div>
                               <CurrencyDisplay
                                 amount={assetMarketData.currentPrice}
                                 currency={currency}
                                 variant="compact"
                                 className="font-medium"
                               />
                               {assetMarketData.lastUpdated && (
                                 <div className="text-xs text-muted-foreground">
                                   {new Date(assetMarketData.lastUpdated).toLocaleTimeString()}
                                 </div>
                               )}
                             </div>
                           ) : symbol ? (
                            <div className="text-muted-foreground text-sm">Loading...</div>
                          ) : (
                            <div className="text-muted-foreground">-</div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('change24h') && (
                        <TableCell className="text-right">
                          {assetMarketData?.priceChangePercentage24h !== undefined ? (
                            <div className={cn(
                              "flex items-center justify-end gap-1 font-medium",
                              assetMarketData.priceChangePercentage24h >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {assetMarketData.priceChangePercentage24h >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(assetMarketData.priceChangePercentage24h).toFixed(2)}%
                            </div>
                          ) : (
                            <div className="text-muted-foreground">-</div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('trend') && (
                        <TableCell>
                          {symbol ? (
                            <PriceSparkline symbol={symbol} className="w-16 h-8" />
                          ) : (
                            <div className="w-16 h-8 bg-muted rounded opacity-50"></div>
                          )}
                        </TableCell>
                      )}
                       {visibleColumns.includes('marketValue') && (
                         <TableCell className="text-right font-medium">
                           <CurrencyDisplay
                             amount={valueChange?.currentValue || asset.current_value || asset.asset_value || 0}
                             currency={currency}
                             variant="compact"
                           />
                         </TableCell>
                       )}
                       {visibleColumns.includes('costBasis') && (
                         <TableCell className="text-right">
                           <CurrencyDisplay
                             amount={asset.acquisition_cost || 0}
                             currency={currency}
                             variant="compact"
                           />
                         </TableCell>
                       )}
                      {visibleColumns.includes('unrealizedPL') && (
                        <TableCell className="text-right">
                          {valueChange ? (
                            <div className={cn(
                              "flex items-center justify-end gap-1",
                              valueChange.change >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {valueChange.change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                               <span>
                                 <CurrencyDisplay
                                   amount={Math.abs(valueChange.change)}
                                   currency={currency}
                                   variant="compact"
                                   className="inline"
                                 /> 
                                 ({valueChange.changePercent.toFixed(1)}%)
                               </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                      )}
                       {visibleColumns.includes('annualIncome') && (
                         <TableCell className="text-right text-green-600 font-medium">
                           <CurrencyDisplay
                             amount={asset.annual_income || 0}
                             currency={currency}
                             variant="compact"
                           />
                         </TableCell>
                       )}
                      {visibleColumns.includes('tags') && (
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-32">
                            {asset.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {asset.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{asset.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {symbol && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateAlert(symbol, (asset.metadata?.asset_type as any) || 'stock')}
                                className="gap-1"
                                title="Create alert"
                              >
                                {hasAlert(symbol) ? <Bell className="h-3 w-3 text-orange-500" /> : <BellOff className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Asset Details Drawer */}
      {selectedAsset && (
        <AssetDetailsDrawer
          asset={selectedAsset}
          marketData={selectedAsset.metadata?.symbol ? marketData?.[selectedAsset.metadata.symbol as string] : undefined}
          isOpen={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {/* Market Alerts Manager */}
      {showAlertsManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Market Alerts</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAlertsManager(false);
                  setAlertSymbol('');
                }}
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <MarketAlertsManager 
                userId={userId}
                prefilledSymbol={alertSymbol}
                prefilledAssetType="stock"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};