import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, Table } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AssetsAnalyticsView } from './AssetsAnalyticsView';
import { AssetsHoldingsView } from './AssetsHoldingsView';
import { AssetsQuickActionsSidebar } from './AssetsQuickActionsSidebar';
import { AssetsFilterBar } from './AssetsFilterBar';
import { WidgetSelectionDialog } from '@/components/analytics/WidgetSelectionDialog';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import { AlertsDialog } from './AlertsDialog';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useHoldingsSummary } from '@/hooks/useHoldingsSummary';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { refreshExchangeRatesIfNeeded } from '@/lib/currencyUtils';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { getWidgetsForCategory, getCoreWidgets } from '@/utils/widgetCatalog';

interface ModernAssetsLayoutProps {
  userId: string;
}

export const ModernAssetsLayout = ({ userId }: ModernAssetsLayoutProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const portfolioId = searchParams.get('portfolioId') || 'everything';
  
  const [viewMode, setViewMode] = useState<'widgets' | 'holdings'>('widgets');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all'>('ytd');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'type', 'holdings', 'price', 'change', 'value', 'allocation', 'status'
  ]);
  const [isAddAssetWizardOpen, setIsAddAssetWizardOpen] = useState(false);
  const [isAlertsDialogOpen, setIsAlertsDialogOpen] = useState(false);

  const { data: assets, isLoading, error } = useUserAssets(userId);
  const { data: holdingsSummary, isLoading: isHoldingsLoading } = useHoldingsSummary(undefined, userId, timeframe);
  const { currency, updateCurrency } = useCurrencyPreference();
  const { portfolios } = useUserPortfolios(userId);
  
  const currentPortfolio = portfolios?.find(p => p.id === portfolioId);

  const availableColumns = [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'price', label: 'Current Price' },
    { id: 'change', label: '24h Change' },
    { id: 'value', label: 'Total Value' },
    { id: 'allocation', label: 'Allocation' },
    { id: 'status', label: 'Market Status' },
  ];

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleAddAsset = () => {
    setIsAddAssetWizardOpen(true);
  };

  const handleAssetAdded = () => {
    setIsAddAssetWizardOpen(false);
  };

  const handleRefreshQuotes = () => {
    // TODO: Implement quote refresh
    console.log('Refresh quotes clicked');
  };

  const handleViewAlerts = () => {
    setIsAlertsDialogOpen(true);
  };

  const handleExportData = () => {
    // TODO: Implement CSV export
    console.log('Export data clicked');
  };

  const handleCurrencyChange = async (newCurrency: any) => {
    // Ensure we have fresh exchange rates before converting
    await refreshExchangeRatesIfNeeded();
    updateCurrency(newCurrency);
  };

  // Refresh exchange rates on mount
  useEffect(() => {
    refreshExchangeRatesIfNeeded();
  }, []);

  const handlePortfolioChange = (newPortfolioId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('portfolioId', newPortfolioId);
    navigate(`/dashboard?${params.toString()}`, { replace: true });
  };

  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    // Load saved widget preferences from localStorage
    const saved = localStorage.getItem(`assets-visible-widgets-${userId}`);
    const defaultWidgets = getCoreWidgets('assets');
    
    if (!saved) return defaultWidgets;
    
    try {
      const parsed = JSON.parse(saved);
      
      // Get all valid widget IDs from catalog (dynamically)
      const catalogWidgets = getWidgetsForCategory('assets');
      const validCatalogWidgets = catalogWidgets.map(w => w.id);
      
      // Get valid individual asset widget IDs (will be populated once assets load)
      const validAssetWidgets = assets?.map(a => `individual-asset-${a.id}`) || [];
      const allValidIds = [...validCatalogWidgets, ...validAssetWidgets];
      
      // Filter out invalid widget IDs
      const validSelection = parsed.filter((id: string) => allValidIds.includes(id));
      
      console.log('🔍 Widget validation on load:', {
        saved: parsed,
        savedCount: parsed.length,
        validCount: validSelection.length,
        removed: parsed.filter((id: string) => !allValidIds.includes(id))
      });
      
      return validSelection;
    } catch (error) {
      console.error('Error parsing saved widgets:', error);
      return defaultWidgets;
    }
  });

  // Debug: Log visible widgets state
  useEffect(() => {
    console.log('🔍 Current visibleWidgets state:', {
      widgets: visibleWidgets,
      count: visibleWidgets.length
    });
  }, [visibleWidgets]);

  const handleAddWidget = () => {
    setIsWidgetDialogOpen(true);
  };

  const handleApplyWidgetSelection = (selectedWidgets: string[]) => {
    // Get all valid widget IDs from catalog + user assets (dynamically)
    const catalogWidgets = getWidgetsForCategory('assets');
    const validCatalogWidgets = catalogWidgets.map(w => w.id);
    const validAssetWidgets = assets?.map(a => `individual-asset-${a.id}`) || [];
    const allValidIds = [...validCatalogWidgets, ...validAssetWidgets];
    
    // Filter to only valid widgets
    const validSelection = selectedWidgets.filter(id => allValidIds.includes(id));
    
    console.log('🔍 Widget validation on apply:', {
      selected: selectedWidgets,
      selectedCount: selectedWidgets.length,
      validCount: validSelection.length,
      removed: selectedWidgets.filter(id => !allValidIds.includes(id))
    });
    
    setVisibleWidgets(validSelection);
    localStorage.setItem(`assets-visible-widgets-${userId}`, JSON.stringify(validSelection));
    setIsWidgetDialogOpen(false);
  };

  if (error) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>Unable to load assets. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value as 'widgets' | 'holdings')}
          className="bg-card rounded-lg p-1 shadow-sm"
        >
          <ToggleGroupItem 
            value="widgets" 
            aria-label="Widgets view"
            className="data-[state=on]:!bg-openkey-blue data-[state=on]:text-white hover:bg-openkey-blue/10 transition-all duration-200"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Widgets
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="holdings" 
            aria-label="Holdings view"
            className="data-[state=on]:!bg-openkey-blue data-[state=on]:text-white hover:bg-openkey-blue/10 transition-all duration-200"
          >
            <Table className="h-4 w-4 mr-2" />
            Holdings
          </ToggleGroupItem>
        </ToggleGroup>

        <AssetsQuickActionsSidebar
          layout="horizontal"
          viewMode={viewMode}
          onAddAsset={handleAddAsset}
          onAddWidget={handleAddWidget}
          onRefreshQuotes={handleRefreshQuotes}
          onViewAlerts={handleViewAlerts}
          onExportData={handleExportData}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          visibleColumns={visibleColumns}
          availableColumns={availableColumns}
          onColumnToggle={handleToggleColumn}
        />
      </div>

      {/* Filter Bar */}
      <AssetsFilterBar
        portfolioId={portfolioId}
        onPortfolioChange={handlePortfolioChange}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        userId={userId}
        portfolioName={currentPortfolio?.client_name}
      />

      {/* Content Area */}
      {viewMode === 'widgets' ? (
        <AssetsAnalyticsView
          holdingsSummary={holdingsSummary}
          isHoldingsLoading={isHoldingsLoading}
          currency={currency}
          visibleColumns={visibleColumns}
          availableColumns={availableColumns}
          onToggleColumn={handleToggleColumn}
          visibleWidgets={visibleWidgets}
          userId={userId}
          timeframe={timeframe}
        />
      ) : (
        <AssetsHoldingsView
          holdingsSummary={holdingsSummary}
          isHoldingsLoading={isHoldingsLoading}
          currency={currency}
          visibleColumns={visibleColumns}
          availableColumns={availableColumns}
          onToggleColumn={handleToggleColumn}
          onAddAsset={handleAddAsset}
          onRefreshQuotes={handleRefreshQuotes}
          onViewAlerts={handleViewAlerts}
          onExportData={handleExportData}
          onCurrencyChange={handleCurrencyChange}
        />
      )}

      {/* Widget Selection Dialog */}
      <WidgetSelectionDialog
        isOpen={isWidgetDialogOpen}
        onOpenChange={setIsWidgetDialogOpen}
        category="assets"
        onApplySelection={handleApplyWidgetSelection}
        currentVisibleWidgets={visibleWidgets}
        userAssets={assets}
        userId={userId}
      />

      {/* Add Asset Wizard */}
      <AddAssetWizard
        portfolioId={portfolioId}
        isOpen={isAddAssetWizardOpen}
        onOpenChange={setIsAddAssetWizardOpen}
        onAssetAdded={handleAssetAdded}
      />

      {/* Alerts Dialog */}
      <AlertsDialog
        userId={userId}
        isOpen={isAlertsDialogOpen}
        onOpenChange={setIsAlertsDialogOpen}
      />
    </div>
  );
};
