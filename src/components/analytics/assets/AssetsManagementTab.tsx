import { useState, useEffect } from 'react';
import { Search, Building2, Bell, TrendingUp, TrendingDown, Tag, FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AssetDetailsDrawer } from '@/components/portfolio/AssetDetailsDrawer';
import PriceSparkline from '@/components/portfolio/PriceSparkline';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { UserAsset } from '@/hooks/useUserAssets';
import { cn } from '@/lib/utils';

interface AssetsManagementTabProps {
  assets: UserAsset[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: Array<{ name: string; id: string; color: string }>;
  sortBy: 'name' | 'value' | 'updated';
  onSortChange: (sortBy: 'name' | 'value' | 'updated') => void;
  selectedAssets: Set<string>;
  setSelectedAssets: (assets: Set<string>) => void;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectAsset: (assetId: string, checked: boolean) => void;
  bulkUpdateInProgress: boolean;
  onBulkAddTags: (tags: string[]) => void;
  onBulkChangeCategory: (categoryId: string) => void;
  visibleColumns: string[];
  marketData: any;
  alerts: any[];
  currency: string;
  assetSymbolFilter: string;
  assetCategoryFilter: string;
  onClearSymbolFilter: () => void;
  onClearCategoryFilter: () => void;
  onClearAllFilters: () => void;
  getValueChange: (asset: UserAsset) => any;
  onCreateAlert: (symbol: string, assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity') => void;
  onAssetClick: (asset: UserAsset) => void;
}

export const AssetsManagementTab = ({
  assets,
  isLoading,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categories,
  sortBy,
  onSortChange,
  selectedAssets,
  setSelectedAssets,
  isAllSelected,
  onSelectAll,
  onSelectAsset,
  bulkUpdateInProgress,
  onBulkAddTags,
  onBulkChangeCategory,
  visibleColumns,
  marketData,
  alerts,
  currency,
  assetSymbolFilter,
  assetCategoryFilter,
  onClearSymbolFilter,
  onClearCategoryFilter,
  onClearAllFilters,
  getValueChange,
  onCreateAlert,
  onAssetClick
}: AssetsManagementTabProps) => {
  
  // Helper function to check if asset has alerts
  const hasAlert = (symbol: string) => {
    return alerts.some(alert => alert.symbol === symbol && alert.is_active);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-blue-gold flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gradient-blue-gold">Asset Management</h2>
          <p className="text-muted-foreground">Manage and organize your portfolio assets</p>
        </div>
      </div>

      {/* Filter Chips */}
      {(assetSymbolFilter || assetCategoryFilter) && (
        <div className="flex flex-wrap gap-2">
          {assetSymbolFilter && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="bg-openkey-blue/10 text-openkey-blue border-openkey-blue/20">
                Symbol: {assetSymbolFilter}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearSymbolFilter}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {assetCategoryFilter && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="bg-openkey-gold/10 text-openkey-gold border-openkey-gold/20">
                Category: {assetCategoryFilter}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearCategoryFilter}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClearAllFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="card-elevated border-openkey-blue/20 bg-gradient-subtle-blue/10 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-openkey-blue">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search assets, descriptions, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-openkey-blue/20 focus:border-openkey-blue/50"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 border-openkey-blue/20">
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

            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-full sm:w-32 border-openkey-blue/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="value">Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedAssets.size > 0 && (
        <Card className="card-elevated border-openkey-gold/20 bg-gradient-subtle-gold/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-openkey-gold">
                {selectedAssets.size} asset{selectedAssets.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={bulkUpdateInProgress} className="border-openkey-gold/30">
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tags
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onBulkAddTags(['growth'])}>
                      Growth
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkAddTags(['dividend'])}>
                      Dividend
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkAddTags(['speculative'])}>
                      Speculative
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkAddTags(['blue-chip'])}>
                      Blue Chip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={bulkUpdateInProgress} className="border-openkey-gold/30">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Change Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {categories.map(category => (
                      <DropdownMenuItem 
                        key={category.id}
                        onClick={() => onBulkChangeCategory(category.id)}
                      >
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-openkey-blue/30"
                  onClick={() => {
                    setSelectedAssets(new Set());
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets Table */}
      <Card className="card-elevated card-hover-gold border-openkey-blue/20 bg-gradient-subtle-blue/30 shadow-lg backdrop-blur-sm">
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
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assets found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? "No assets match your current filters." 
                  : "You haven't added any assets yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-openkey-blue/5 backdrop-blur-sm">
                <TableRow className="border-openkey-blue/20 hover:bg-openkey-blue/10">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={onSelectAll}
                      aria-label="Select all assets"
                      className="border-openkey-blue/50 data-[state=checked]:bg-openkey-blue data-[state=checked]:border-openkey-blue"
                    />
                  </TableHead>
                  {visibleColumns.includes('name') && <TableHead className="font-semibold text-openkey-blue">Name</TableHead>}
                  {visibleColumns.includes('category') && <TableHead className="font-semibold text-openkey-blue">Category</TableHead>}
                  {visibleColumns.includes('price') && <TableHead className="font-semibold text-openkey-blue">Price</TableHead>}
                  {visibleColumns.includes('change24h') && <TableHead className="font-semibold text-openkey-blue">24h %</TableHead>}
                  {visibleColumns.includes('trend') && <TableHead className="font-semibold text-openkey-blue">Trend</TableHead>}
                  {visibleColumns.includes('marketValue') && <TableHead className="text-right font-semibold text-openkey-blue">Market Value</TableHead>}
                  {visibleColumns.includes('costBasis') && <TableHead className="text-right font-semibold text-openkey-blue">Cost Basis</TableHead>}
                  {visibleColumns.includes('unrealizedPL') && <TableHead className="text-right font-semibold text-openkey-blue">Unrealized P/L</TableHead>}
                  {visibleColumns.includes('annualIncome') && <TableHead className="text-right font-semibold text-openkey-blue">Annual Income</TableHead>}
                  {visibleColumns.includes('tags') && <TableHead className="font-semibold text-openkey-blue">Tags</TableHead>}
                  {visibleColumns.includes('actions') && <TableHead className="font-semibold text-openkey-blue">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const valueChange = getValueChange(asset);
                  const symbol = asset.metadata?.symbol as string;
                  const assetMarketData = symbol && marketData?.[symbol];
                  
                  return (
                    <TableRow 
                      key={asset.id} 
                      data-asset-id={asset.id} 
                      className="cursor-pointer transition-all duration-300 hover:bg-openkey-gold/5 border-b border-openkey-blue/10 group backdrop-blur-sm" 
                      onClick={() => onAssetClick(asset)}
                    >
                      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={(checked) => onSelectAsset(asset.id, checked as boolean)}
                          aria-label={`Select ${asset.asset_name}`}
                          className="border-openkey-blue/50 data-[state=checked]:bg-openkey-blue data-[state=checked]:border-openkey-blue"
                        />
                      </TableCell>
                      
                      {visibleColumns.includes('name') && (
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-gradient-blue-gold flex items-center justify-center text-sm font-bold text-white shadow-md group-hover:shadow-lg transition-all duration-300">
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
                                <p className="text-xs text-muted-foreground font-mono">
                                  {symbol}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.includes('category') && (
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs font-medium border-openkey-blue/20",
                              `bg-openkey-${asset.category_color_theme || 'blue'}/10 text-openkey-${asset.category_color_theme || 'blue'}`
                            )}
                          >
                            {asset.category_display_name}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Continue with other columns... */}
                      {visibleColumns.includes('marketValue') && (
                        <TableCell className="text-right font-medium text-openkey-blue">
                          <CurrencyDisplay 
                            amount={valueChange?.currentValue || asset.current_value || asset.asset_value || 0} 
                            currency={currency as any} 
                          />
                        </TableCell>
                      )}

                      {visibleColumns.includes('costBasis') && (
                        <TableCell className="text-right">
                          <CurrencyDisplay 
                            amount={asset.acquisition_cost || asset.asset_value || 0} 
                            currency={currency as any} 
                          />
                        </TableCell>
                      )}

                      {visibleColumns.includes('unrealizedPL') && (
                        <TableCell className="text-right">
                          {valueChange && (
                            <div className="space-y-1">
                              <CurrencyDisplay 
                                amount={valueChange.change} 
                                currency={currency as any}
                                className={valueChange.change >= 0 ? 'text-green-600' : 'text-red-600'}
                              />
                              <div className={`text-xs font-medium ${valueChange.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {valueChange.changePercent >= 0 ? '+' : ''}{valueChange.changePercent.toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.includes('tags') && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-32">
                            {asset.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs border-openkey-gold/30 text-openkey-gold">
                                {tag}
                              </Badge>
                            ))}
                            {asset.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{asset.tags.length - 2}</span>
                            )}
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
    </div>
  );
};