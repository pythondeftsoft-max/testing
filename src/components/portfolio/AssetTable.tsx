import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import AssetInviteButton from '@/components/AssetInviteButton';
import PriceSparkline from './PriceSparkline';

interface AssetData {
  id: string;
  asset_name: string;
  current_value?: number;
  acquisition_cost?: number;
  annual_income: number;
  portfolio_id?: string;
  metadata?: {
    symbol?: string;
    asset_type?: string;
    shares?: number;
  };
  marketData?: {
    currentPrice?: number;
    priceChange24h?: number;
    priceChangePercentage24h?: number;
    marketValue?: number;
    costBasis?: number;
    unrealizedPL?: number;
    unrealizedPLPercent?: number;
  };
}

interface AssetTableProps {
  assets: AssetData[];
  isLoading: boolean;
}

type SortField = 'name' | 'value' | 'change' | 'income';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const AssetTable = ({ assets, isLoading }: AssetTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedAssets = React.useMemo(() => {
    let filtered = assets.filter(asset => {
      const searchLower = searchTerm.toLowerCase();
      const symbol = asset.metadata?.symbol?.toLowerCase() || '';
      const name = asset.asset_name.toLowerCase();
      return name.includes(searchLower) || symbol.includes(searchLower);
    });

    return filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'name':
          return sortDirection === 'asc' 
            ? a.asset_name.localeCompare(b.asset_name)
            : b.asset_name.localeCompare(a.asset_name);
        
        case 'value':
          aValue = a.marketData?.marketValue || (a.marketData?.currentPrice && a.metadata?.shares) 
            ? a.marketData.currentPrice * a.metadata.shares 
            : a.current_value || 0;
          bValue = b.marketData?.marketValue || (b.marketData?.currentPrice && b.metadata?.shares) 
            ? b.marketData.currentPrice * b.metadata.shares 
            : b.current_value || 0;
          break;
        
        case 'change':
          aValue = a.marketData?.priceChangePercentage24h || 0;
          bValue = b.marketData?.priceChangePercentage24h || 0;
          break;
        
        case 'income':
          aValue = a.annual_income || 0;
          bValue = b.annual_income || 0;
          break;
        
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [assets, searchTerm, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 bg-muted rounded w-64 animate-pulse"></div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>24h Change</TableHead>
                <TableHead>Annual Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-muted rounded w-18 animate-pulse"></div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium text-left justify-start"
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3" />
      </div>
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search assets by name or symbol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>
                <SortButton field="name">Asset</SortButton>
              </TableHead>
              <TableHead>Chart</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>
                <SortButton field="value">Value</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="change">24h Change</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="income">Annual Income</SortButton>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedAssets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No assets match your search.' : 'No assets found.'}
              </TableCell>
            </TableRow>
            ) : (
              filteredAndSortedAssets.map((asset) => {
                const symbol = asset.metadata?.symbol || asset.asset_name;
                const shares = asset.metadata?.shares || 1;
                const currentPrice = asset.marketData?.currentPrice;
                const marketValue = asset.marketData?.marketValue || currentPrice ? currentPrice * shares : asset.current_value || 0;
                const change24h = asset.marketData?.priceChangePercentage24h;
                const priceChange24h = asset.marketData?.priceChange24h;

                return (
                  <TableRow key={asset.id} className="table-row-hover">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{asset.asset_name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {symbol.toUpperCase()}
                          </Badge>
                          {asset.metadata?.asset_type && (
                            <Badge variant="outline" className="text-xs">
                              {asset.metadata.asset_type}
                            </Badge>
                          )}
                        </div>
                        {shares > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {shares.toLocaleString()} shares
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriceSparkline symbol={symbol} />
                    </TableCell>
                    <TableCell>
                      {currentPrice ? (
                        <div className="space-y-1">
                          <div className="font-medium">{formatCurrency(currentPrice)}</div>
                          {priceChange24h && (
                            <div className={`text-xs flex items-center gap-1 ${
                              priceChange24h >= 0 ? 'text-success' : 'text-danger'
                            }`}>
                              {priceChange24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {formatCurrency(Math.abs(priceChange24h))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(marketValue)}</div>
                    </TableCell>
                    <TableCell>
                      {change24h !== undefined ? (
                        <div className={`flex items-center gap-1 ${
                          change24h >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {change24h >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-medium">{formatPercent(change24h)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {asset.annual_income > 0 ? (
                        <div className="font-medium text-success">
                          {formatCurrency(asset.annual_income)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AssetInviteButton 
                        assetId={asset.id}
                        assetName={asset.asset_name}
                        portfolioId={asset.portfolio_id}
                        className="text-xs"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Count */}
      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedAssets.length} of {assets.length} assets
        </div>
      )}
    </div>
  );
};

export default AssetTable;