import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Coins, Building2, Wallet } from 'lucide-react';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useWidgetFavorites } from '@/hooks/useWidgetFavorites';
import { WidgetActionsMenu } from '@/components/analytics/WidgetActionsMenu';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { formatInternationalCurrency } from '@/lib/currencyUtils';

interface IndividualAssetWidgetProps {
  assetId: string;
  userId: string;
  currency?: SupportedCurrency;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const IndividualAssetWidget: React.FC<IndividualAssetWidgetProps> = ({
  assetId,
  userId,
  currency = 'USD',
  timeframe = 'ytd',
}) => {
  const { data: allAssets, isLoading } = useUserAssets(userId);
  const { isFavorited, toggleFavorite } = useWidgetFavorites(userId);
  
  // Find the specific asset
  const asset = allAssets?.find(a => a.id === assetId);
  
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!asset) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Asset not found</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get performance data based on selected timeframe
  const getPerformanceByTimeframe = () => {
    switch (timeframe) {
      case '24h': return asset.metadata?.performance_24h || 0;
      case '7d': return asset.metadata?.performance_7d || 0;
      case '30d': return asset.metadata?.performance_30d || 0;
      case '90d': return asset.metadata?.performance_90d || 0;
      case 'ytd': return asset.metadata?.performance_ytd || 0;
      case '1y': return asset.metadata?.performance_1y || 0;
      case 'all': return asset.metadata?.performance_all || ((asset.current_value - (asset.acquisition_cost || asset.current_value)) / (asset.acquisition_cost || asset.current_value)) * 100;
      default: return asset.metadata?.performance_ytd || 0;
    }
  };
  
  const changePercent = getPerformanceByTimeframe().toFixed(2);
  const isPositive = parseFloat(changePercent) >= 0;
  
  // Calculate dollar change based on timeframe
  const currentPrice = asset.metadata?.current_price || 0;
  const priceAtTimeframe = currentPrice / (1 + parseFloat(changePercent) / 100);
  const changeDollar = currentPrice - priceAtTimeframe;
  
  // Get icon based on category
  const getAssetIcon = () => {
    const categoryName = asset.category_name?.toLowerCase() || '';
    if (categoryName.includes('crypto')) return Coins;
    if (categoryName.includes('stock') || categoryName.includes('equity')) return TrendingUp;
    if (categoryName.includes('real estate') || categoryName.includes('property')) return Building2;
    return Wallet;
  };
  
  const AssetIcon = getAssetIcon();
  const currentValue = asset.current_value || asset.asset_value || 0;
  const gainLoss = currentValue - (asset.acquisition_cost || currentValue);
  const gainLossPercent = asset.acquisition_cost 
    ? ((gainLoss / asset.acquisition_cost) * 100).toFixed(2)
    : '0.00';
  const isGainPositive = gainLoss >= 0;
  
  // Get additional data from metadata
  const quantity = asset.metadata?.quantity;
  const assetType = asset.metadata?.asset_type || 'asset';
  const symbol = asset.metadata?.symbol || '';
  const allocationPercent = asset.metadata?.allocation_percent;
  
  // Format quantity display based on asset type
  const getQuantityDisplay = () => {
    if (!quantity) return null;
    
    if (assetType === 'stock') {
      return `${quantity.toLocaleString()} shares`;
    } else if (assetType === 'crypto') {
      return `${quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${symbol}`;
    } else {
      return `${quantity.toLocaleString()} units`;
    }
  };
  
  // Get timeframe display text
  const getTimeframeDisplay = () => {
    const displayMap = {
      '24h': '24H',
      '7d': '7D',
      '30d': '30D',
      '90d': '90D',
      'ytd': 'YTD',
      '1y': '1Y',
      'all': 'ALL'
    };
    return displayMap[timeframe];
  };
  
  const widgetId = `individual-asset-${assetId}`;
  
  const handleToggleFavorite = () => {
    toggleFavorite(widgetId, {
      id: widgetId,
      tab: 'financial',
      category: 'assets',
      title: asset.asset_name,
      componentType: 'panel',
      widgetProps: {
        value: currentValue,
        subtitle: asset.category_display_name,
        icon: AssetIcon.name,
        formatValue: 'currency',
      }
    });
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors relative">
      <div className="absolute top-2 right-2 z-10">
        <WidgetActionsMenu
          isFavorited={isFavorited(widgetId)}
          onToggleFavorite={handleToggleFavorite}
          onDelete={() => {}}
        />
      </div>
      <CardHeader className="pb-2 p-3">
        <div className="flex items-start justify-between pr-8">
          <div className="flex items-center gap-2">
            <AssetIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              {asset.asset_name}
            </CardTitle>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge 
            variant="secondary" 
            className="text-[10px] w-fit px-1.5 py-0.5"
            style={{ backgroundColor: `${asset.category_color_theme}20` }}
          >
            {asset.category_display_name}
          </Badge>
          <Badge 
            variant="outline" 
            className="text-[10px] w-fit px-1.5 py-0.5 border-primary/30 text-primary"
          >
            {getTimeframeDisplay()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {/* Market Value */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Market Value</p>
          <p className="text-lg font-bold">
            {formatInternationalCurrency(currentValue, currency)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{changePercent}% ({getTimeframeDisplay()})
            </span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-border my-3" />
        
        {/* Stats Grid - 2 columns for better readability */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {/* Left Column */}
          <div className="space-y-2">
            {/* Shares/Coins */}
            {quantity ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {assetType === 'stock' ? 'Shares' : assetType === 'crypto' ? 'Coins' : 'Quantity'}
                </p>
                <p className="text-sm font-semibold">{getQuantityDisplay()}</p>
              </div>
            ) : null}
            
            {/* Cost Basis */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cost Basis</p>
              <p className="text-sm font-semibold">
                {formatInternationalCurrency(asset.acquisition_cost || 0, currency)}
              </p>
            </div>
            
            {/* All Time Net */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">All Time Net</p>
              <p className={`text-sm font-semibold ${isGainPositive ? 'text-success' : 'text-destructive'}`}>
                {isGainPositive ? '+' : ''}{formatInternationalCurrency(gainLoss, currency)}
              </p>
              <span className="text-xs">
                ({isGainPositive ? '+' : ''}{gainLossPercent}%)
              </span>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-2">
            {/* Price */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="text-sm font-semibold">
                {formatInternationalCurrency(currentPrice, currency)}
              </p>
            </div>
            
            {/* Allocation */}
            {allocationPercent ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Allocation</p>
                <p className="text-sm font-semibold">{allocationPercent.toFixed(2)}%</p>
              </div>
            ) : null}
            
            {/* Timeframe Change */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{getTimeframeDisplay()} Change</p>
              <p className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{formatInternationalCurrency(changeDollar, currency)}
              </p>
              <span className="text-xs">
                ({isPositive ? '+' : ''}{changePercent}%)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
