import { useAssetNavigation } from '@/hooks/useAssetNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PerformerData {
  symbol: string;
  change_percent: number;
  timeframe: string;
  current_price: number;
  quantity: number;
  total_value: number;
  acquisition_cost: number;
  gain_loss_amount: number;
  asset_type: string;
}

interface TopMoversProps {
  topMovers: PerformerData[];
  isLoading: boolean;
  currency?: string;
  timeframe?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
}

export const TopMovers = ({ topMovers, isLoading, currency = 'USD', timeframe = 'ytd' }: TopMoversProps) => {
  const { navigateToAssets, getCurrentCurrency } = useAssetNavigation();

  const getUnitLabel = (assetType: string): string => {
    const labels: Record<string, string> = {
      'stock': 'shares',
      'crypto': 'coins',
      'etf': 'shares',
      'bond': 'bonds',
      'reit': 'shares',
      'commodity': 'units',
      'index': 'shares'
    };
    return labels[assetType] || 'units';
  };

  const getTimeframeLabel = (timeframe: string): string => {
    const labels: Record<string, string> = {
      '24h': '24 Hour',
      '7d': '7 Day',
      '30d': '30 Day',
      '90d': '3 Month',
      'ytd': 'Year to Date',
      '1y': '1 Year'
    };
    return labels[timeframe] || timeframe.toUpperCase();
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleAssetClick = (symbol: string) => {
    navigateToAssets({
      assetSymbol: symbol,
      currency: getCurrentCurrency()
    });
  };
  
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Asset</TableHead>
            <TableHead className="text-center w-[23%]">% Gain/Loss</TableHead>
            <TableHead className="text-center w-[23%]">$ Gain/Loss</TableHead>
            <TableHead className="text-right w-[24%]">Total Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              <TableCell><Skeleton className="h-10 w-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!topMovers || topMovers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No performance data available
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Asset</TableHead>
          <TableHead className="text-center w-[23%]">% Gain/Loss</TableHead>
          <TableHead className="text-center w-[23%]">$ Gain/Loss</TableHead>
          <TableHead className="text-right w-[24%]">Total Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topMovers.map((mover) => {
          const isPositive = mover.change_percent >= 0;
          const Icon = isPositive ? TrendingUp : TrendingDown;
          const colorClass = isPositive ? 'text-success' : 'text-destructive';
          const bgClass = isPositive ? 'bg-success/10' : 'bg-destructive/10';
          
          return (
             <TableRow 
              key={mover.symbol}
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => handleAssetClick(mover.symbol)}
            >
              {/* Asset (Icon + Symbol) */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${bgClass} flex-shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
                  </div>
                  <span className="font-semibold text-sm">{mover.symbol}</span>
                </div>
              </TableCell>
              
              {/* Percent Gain/Loss */}
              <TableCell className={`text-center font-bold text-base ${colorClass}`}>
                {isPositive ? '+' : ''}{mover.change_percent.toFixed(2)}%
              </TableCell>
              
              {/* Dollar Gain/Loss */}
              <TableCell className={`text-center font-semibold text-base ${colorClass}`}>
                {isPositive ? '+' : ''}{formatCurrency(mover.gain_loss_amount)}
              </TableCell>
              
              {/* Total Value */}
              <TableCell className="text-right font-semibold text-sm">
                {formatCurrency(mover.total_value)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};