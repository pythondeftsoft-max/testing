import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { WidgetActionsMenu } from '../WidgetActionsMenu';

interface IndividualAssetCardProps {
  assetData: {
    id: string;
    asset_name: string;
    asset_value: number;
    current_value?: number | null;
    metadata?: {
      symbol?: string;
      asset_type?: string;
      quantity?: number;
      current_price?: number;
      performance_24h?: number;
      performance_7d?: number;
      performance_30d?: number;
    };
  };
  onRemove?: (widgetId: string) => void;
  onToggleFavorite?: (widgetId: string) => void;
  isFavorited?: boolean;
  isPreview?: boolean;
  widgetId?: string;
}

export const IndividualAssetCard: React.FC<IndividualAssetCardProps> = ({
  assetData,
  onRemove,
  onToggleFavorite,
  isFavorited = false,
  isPreview = false,
  widgetId
}) => {
  const assetType = assetData.metadata?.asset_type || 'other';
  const symbol = assetData.metadata?.symbol || '';
  const quantity = assetData.metadata?.quantity || 0;
  const currentPrice = assetData.metadata?.current_price || 0;
  const performance24h = assetData.metadata?.performance_24h || 0;
  const totalValue = assetData.current_value || assetData.asset_value || 0;

  const getAssetTypeColor = () => {
    switch (assetType.toLowerCase()) {
      case 'stock': return 'bg-blue-100 text-blue-800';
      case 'crypto': return 'bg-purple-100 text-purple-800';
      case 'etf': return 'bg-green-100 text-green-800';
      case 'bond': return 'bg-yellow-100 text-yellow-800';
      case 'commodity': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Card className="bg-card border-openkey-blue/20 hover:shadow-md transition-all relative h-full">
      {!isPreview && (onRemove || onToggleFavorite) && widgetId && (
        <div className="absolute top-2 right-2 z-10">
          <WidgetActionsMenu
            isFavorited={isFavorited}
            onToggleFavorite={() => onToggleFavorite?.(widgetId)}
            onDelete={() => onRemove?.(widgetId)}
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-openkey-blue truncate">
              {assetData.asset_name}
            </CardTitle>
            {symbol && (
              <div className="text-xs text-muted-foreground mt-1">{symbol}</div>
            )}
          </div>
          <Badge className={`${getAssetTypeColor()} text-xs whitespace-nowrap`}>
            {assetType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Total Value */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Total Value</div>
          <div className="text-2xl font-bold text-openkey-blue">
            {formatCurrency(totalValue)}
          </div>
        </div>

        {/* Quantity & Price */}
        {quantity > 0 && currentPrice > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Quantity</div>
              <div className="text-sm font-semibold">
                {quantity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Price</div>
              <div className="text-sm font-semibold">
                {formatCurrency(currentPrice)}
              </div>
            </div>
          </div>
        )}

        {/* Performance */}
        {performance24h !== 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">24h Change</span>
              <div className={`flex items-center gap-1 font-semibold text-sm ${
                performance24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {performance24h >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(performance24h)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
