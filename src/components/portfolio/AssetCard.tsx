import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, TrendingUp, Calendar, Mail } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { PortfolioAsset } from '@/types/portfolio-assets';

interface AssetCardProps {
  asset: PortfolioAsset;
  onViewDetails?: (assetId: string, tab?: string) => void;
  onEdit?: (assetId: string) => void;
  onValuation?: (assetId: string) => void;
  onRelationships?: (assetId: string) => void;
  onInvite?: (assetId: string) => void;
}

export const AssetCard = ({ asset, onViewDetails, onEdit, onValuation, onRelationships, onInvite }: AssetCardProps) => {

  const getAssetCategoryVariant = (categoryName?: string) => {
    if (!categoryName) return 'secondary';
    
    const categoryLower = categoryName.toLowerCase();
    if (categoryLower.includes('yacht') || categoryLower.includes('boat')) return 'default';
    if (categoryLower.includes('property') || categoryLower.includes('real estate')) return 'default';
    if (categoryLower.includes('vehicle') || categoryLower.includes('car')) return 'default';
    if (categoryLower.includes('equipment') || categoryLower.includes('machinery')) return 'default';
    
    return 'secondary';
  };

  return (
    <>
      <CardEnhanced variant="elevated" className="h-full" hover animate>
        <CardEnhancedHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardEnhancedTitle className="text-lg">{asset.asset_name}</CardEnhancedTitle>
              <Badge variant={getAssetCategoryVariant(asset.asset_category?.display_name)}>
                {asset.asset_category?.display_name || 'Uncategorized'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(asset.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(asset.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Asset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onValuation?.(asset.id)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Update Valuation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRelationships?.(asset.id)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Relationships
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onInvite?.(asset.id)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Tenant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardEnhancedHeader>
        
        <CardEnhancedContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Value:</span>
              <span className="font-medium">
                {asset.current_value ? <CurrencyDisplay amount={asset.current_value} /> : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Acquisition Cost:</span>
              <span className="font-medium">
                {asset.acquisition_cost ? <CurrencyDisplay amount={asset.acquisition_cost} /> : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual Income:</span>
              <span className="font-medium">
                {asset.annual_income ? <CurrencyDisplay amount={asset.annual_income} /> : 'N/A'}
              </span>
            </div>
          </div>

          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground space-y-1">
                {asset.metadata.location && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{asset.metadata.location}</span>
                  </div>
                )}
                {asset.metadata.size && (
                  <div className="flex items-center gap-1">
                    <span>📏</span>
                    <span>{asset.metadata.size}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardEnhancedContent>
      </CardEnhanced>
    </>
  );
};
