import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { convertMultipleCurrencies, type SupportedCurrency } from '@/lib/currencyUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Bitcoin, Building2, Coins, TrendingUpIcon, ArrowUpDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { AssetsTableFilters } from './AssetsTableFilters';

export interface AssetData {
  name: string;
  symbol: string;
  type: string;
  holdings: number;
  currentPrice: number;
  totalValue: number;
  allocation: number;
  marketStatus: 'open' | 'closed' | 'unknown';
  sector?: string;
  costBasis?: number;
  // Timeframe-specific performance data
  performance24h?: number;
  performance7d?: number;
  performance30d?: number;
  performance90d?: number;
  performanceYTD?: number;
  performance1y?: number;
  performanceAll?: number;
  // Timeframe-specific unrealized gains
  unrealizedGain24h?: number;
  unrealizedGain7d?: number;
  unrealizedGain30d?: number;
  unrealizedGain90d?: number;
  unrealizedGainYTD?: number;
  unrealizedGain1y?: number;
  unrealizedGainAll?: number;
}

interface AssetsTableWithSortingProps {
  assets: AssetData[];
  isLoading: boolean;
  currency?: SupportedCurrency;
  showTitle?: boolean;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

const getAssetIcon = (type: string) => {
  const iconClass = "h-4 w-4";
  switch (type.toLowerCase()) {
    case 'cryptocurrency':
      return <Bitcoin className={iconClass} />;
    case 'real estate':
      return <Building2 className={iconClass} />;
    case 'commodity':
      return <Coins className={iconClass} />;
    default:
      return <TrendingUpIcon className={iconClass} />;
  }
};

export const AssetsTableWithSorting = ({ 
  assets, 
  isLoading, 
  currency = 'USD', 
  showTitle = true,
  timeframe = 'ytd',
}: AssetsTableWithSortingProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'allocation', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'gainers' | 'losers' | 'ytd-gainers' | 'ytd-losers'>('all');
  const [convertedAssets, setConvertedAssets] = useState<AssetData[]>(assets);
  const [isConverting, setIsConverting] = useState(false);

  // Batch currency conversion for all asset values
  useEffect(() => {
    const convertAllAssets = async () => {
      // If currency is USD, no conversion needed (mock data is in USD)
      if (currency === 'USD') {
        setConvertedAssets(assets);
        return;
      }

      setIsConverting(true);
      try {
        // Prepare batch conversion requests for all monetary values
        const conversions = assets.flatMap(asset => [
          {
            id: `${asset.symbol}-price`,
            amount: asset.currentPrice,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          },
          {
            id: `${asset.symbol}-totalValue`,
            amount: asset.totalValue,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          },
          ...(asset.costBasis ? [{
            id: `${asset.symbol}-costBasis`,
            amount: asset.costBasis,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGain24h !== undefined ? [{
            id: `${asset.symbol}-unrealizedGain24h`,
            amount: asset.unrealizedGain24h,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGain7d !== undefined ? [{
            id: `${asset.symbol}-unrealizedGain7d`,
            amount: asset.unrealizedGain7d,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGain30d !== undefined ? [{
            id: `${asset.symbol}-unrealizedGain30d`,
            amount: asset.unrealizedGain30d,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGain90d !== undefined ? [{
            id: `${asset.symbol}-unrealizedGain90d`,
            amount: asset.unrealizedGain90d,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGainYTD !== undefined ? [{
            id: `${asset.symbol}-unrealizedGainYTD`,
            amount: asset.unrealizedGainYTD,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGain1y !== undefined ? [{
            id: `${asset.symbol}-unrealizedGain1y`,
            amount: asset.unrealizedGain1y,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
          ...(asset.unrealizedGainAll !== undefined ? [{
            id: `${asset.symbol}-unrealizedGainAll`,
            amount: asset.unrealizedGainAll,
            fromCurrency: 'USD' as SupportedCurrency,
            toCurrency: currency,
          }] : []),
        ]);

        const results = await convertMultipleCurrencies(conversions);

        // Apply converted values to assets
        const converted = assets.map(asset => ({
          ...asset,
          currentPrice: results[`${asset.symbol}-price`]?.convertedAmount ?? asset.currentPrice,
          totalValue: results[`${asset.symbol}-totalValue`]?.convertedAmount ?? asset.totalValue,
          costBasis: asset.costBasis ? (results[`${asset.symbol}-costBasis`]?.convertedAmount ?? asset.costBasis) : undefined,
          unrealizedGain24h: asset.unrealizedGain24h !== undefined ? (results[`${asset.symbol}-unrealizedGain24h`]?.convertedAmount ?? asset.unrealizedGain24h) : undefined,
          unrealizedGain7d: asset.unrealizedGain7d !== undefined ? (results[`${asset.symbol}-unrealizedGain7d`]?.convertedAmount ?? asset.unrealizedGain7d) : undefined,
          unrealizedGain30d: asset.unrealizedGain30d !== undefined ? (results[`${asset.symbol}-unrealizedGain30d`]?.convertedAmount ?? asset.unrealizedGain30d) : undefined,
          unrealizedGain90d: asset.unrealizedGain90d !== undefined ? (results[`${asset.symbol}-unrealizedGain90d`]?.convertedAmount ?? asset.unrealizedGain90d) : undefined,
          unrealizedGainYTD: asset.unrealizedGainYTD !== undefined ? (results[`${asset.symbol}-unrealizedGainYTD`]?.convertedAmount ?? asset.unrealizedGainYTD) : undefined,
          unrealizedGain1y: asset.unrealizedGain1y !== undefined ? (results[`${asset.symbol}-unrealizedGain1y`]?.convertedAmount ?? asset.unrealizedGain1y) : undefined,
          unrealizedGainAll: asset.unrealizedGainAll !== undefined ? (results[`${asset.symbol}-unrealizedGainAll`]?.convertedAmount ?? asset.unrealizedGainAll) : undefined,
        }));

        setConvertedAssets(converted);
      } catch (error) {
        console.error('Batch currency conversion error:', error);
        setConvertedAssets(assets); // Fallback to original
      } finally {
        setIsConverting(false);
      }
    };

    convertAllAssets();
  }, [assets, currency]);

  // Get timeframe-specific data based on selected timeframe
  const getPerformanceForTimeframe = (asset: AssetData) => {
    switch (timeframe) {
      case '24h': return asset.performance24h || 0;
      case '7d': return asset.performance7d || 0;
      case '30d': return asset.performance30d || 0;
      case '90d': return asset.performance90d || 0;
      case 'ytd': return asset.performanceYTD || 0;
      case '1y': return asset.performance1y || 0;
      case 'all': return asset.performanceAll || 0;
      default: return asset.performanceYTD || 0;
    }
  };

  const getUnrealizedGainForTimeframe = (asset: AssetData) => {
    switch (timeframe) {
      case '24h': return asset.unrealizedGain24h || 0;
      case '7d': return asset.unrealizedGain7d || 0;
      case '30d': return asset.unrealizedGain30d || 0;
      case '90d': return asset.unrealizedGain90d || 0;
      case 'ytd': return asset.unrealizedGainYTD || 0;
      case '1y': return asset.unrealizedGain1y || 0;
      case 'all': return asset.unrealizedGainAll || 0;
      default: return asset.unrealizedGainYTD || 0;
    }
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case '24h': return '24h';
      case '7d': return '7d';
      case '30d': return '30d';
      case '90d': return '90d';
      case 'ytd': return 'YTD';
      case '1y': return '1y';
      case 'all': return 'All Time';
      default: return 'YTD';
    }
  };

  const columns: ColumnDef<AssetData>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent"
        >
          Asset
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getAssetIcon(row.original.type)}
          <div>
            <div className="font-semibold">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.symbol}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'holdings',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent ml-auto"
        >
          Holdings
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          <div className="text-sm">
            {row.original.holdings.toLocaleString('en-US', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 4 
            })}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.symbol}</div>
        </div>
      ),
    },
    {
      accessorKey: 'currentPrice',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent ml-auto"
        >
          Price
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          <CurrencyDisplay
            amount={row.original.currentPrice}
            currency={currency}
            fromCurrency="USD"
            className="text-sm"
          />
        </div>
      ),
    },
    {
      accessorKey: 'sector',
      header: 'Sector',
      cell: ({ row }) => (
        row.original.sector ? (
          <Badge variant="outline" className="text-xs">
            {row.original.sector}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">--</span>
        )
      ),
    },
    {
      accessorKey: 'avgCostPerUnit',
      header: ({ column }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            Avg. Cost
            <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Average cost per unit (Cost Basis ÷ Holdings). Compare this to Current Price to see your profit/loss per unit.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      cell: ({ row }) => {
        const costBasis = row.original.costBasis;
        const holdings = row.original.holdings;
        
        if (costBasis === undefined || holdings === 0) {
          return <span className="text-xs text-muted-foreground text-right block">--</span>;
        }

        const avgCost = costBasis / holdings;

        return (
          <div className="text-right font-mono">
            <CurrencyDisplay
              amount={avgCost}
              currency={currency}
              fromCurrency="USD"
              className="text-sm"
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'performanceChange',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent ml-auto"
        >
          % Change ({getTimeframeLabel()})
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const changePercent = getPerformanceForTimeframe(row.original);
        const isPositive = changePercent >= 0;

        return (
          <div className="text-right">
            <div className={`flex items-center justify-end gap-1 font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'unrealizedGain',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent ml-auto"
        >
          Unrealized Gain ({getTimeframeLabel()})
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const gain = getUnrealizedGainForTimeframe(row.original);
        const changePercent = getPerformanceForTimeframe(row.original);
        const isPositive = gain >= 0;

        return (
          <div className="text-right space-y-0.5">
            <div className={`font-mono font-semibold text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPositive ? '+' : ''}
              <CurrencyDisplay
                amount={gain}
                currency={currency}
                fromCurrency="USD"
                className="inline"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'allocation',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent ml-auto"
        >
          Allocation
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="text-sm font-medium">{row.original.allocation.toFixed(2)}%</div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${Math.min(row.original.allocation, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
  ], [currency]);

  // Apply performance and sector filters using converted assets
  const filteredAssets = useMemo(() => {
    let filtered = [...convertedAssets];

    // Performance filter
    if (performanceFilter === 'gainers') {
      filtered = filtered.filter(asset => getPerformanceForTimeframe(asset) > 0);
    } else if (performanceFilter === 'losers') {
      filtered = filtered.filter(asset => getPerformanceForTimeframe(asset) < 0);
    } else if (performanceFilter === 'ytd-gainers') {
      filtered = filtered.filter(asset => (asset.performanceYTD || 0) > 0);
    } else if (performanceFilter === 'ytd-losers') {
      filtered = filtered.filter(asset => (asset.performanceYTD || 0) < 0);
    }

    // Sector filter
    if (selectedSectors.length > 0) {
      filtered = filtered.filter(asset => 
        asset.sector && selectedSectors.includes(asset.sector)
      );
    }

    return filtered;
  }, [convertedAssets, performanceFilter, selectedSectors]);

  const hasActiveFilters = globalFilter !== '' || selectedSectors.length > 0 || performanceFilter !== 'all';

  const handleClearFilters = () => {
    setGlobalFilter('');
    setSelectedSectors([]);
    setPerformanceFilter('all');
  };

  if (isLoading || isConverting) {
    return (
      <Card className="bg-card border-border">
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Assets Portfolio {isConverting && <span className="text-xs text-muted-foreground ml-2">(Converting...)</span>}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-base font-semibold">Assets Portfolio</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <AssetsTableFilters
          searchQuery={globalFilter}
          onSearchChange={setGlobalFilter}
          selectedSectors={selectedSectors}
          onSectorsChange={setSelectedSectors}
          performanceFilter={performanceFilter}
          onPerformanceFilterChange={setPerformanceFilter}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredAssets}
            sorting={sorting}
            onSortingChange={setSorting}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </div>
      </CardContent>
    </Card>
  );
};