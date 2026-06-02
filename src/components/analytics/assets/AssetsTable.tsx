import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { type SupportedCurrency } from '@/lib/currencyUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Bitcoin, Building2, Coins, TrendingUpIcon } from 'lucide-react';

interface AssetData {
  name: string;
  symbol: string;
  type: string;
  holdings: number;
  currentPrice: number;
  totalValue: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  allocation: number;
  marketStatus: 'open' | 'closed' | 'unknown';
  sector?: string;
  costBasis?: number;
  unrealizedGain?: number;
  unrealizedGainPercent?: number;
  performanceYTD?: number;
  performanceYTDAmount?: number;
}

interface AssetsTableProps {
  assets: AssetData[];
  isLoading: boolean;
  currency?: SupportedCurrency;
  showTitle?: boolean;
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

export const AssetsTable = ({ assets, isLoading, currency = 'USD', showTitle = true }: AssetsTableProps) => {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-base font-semibold">Assets Portfolio</CardTitle>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Asset</TableHead>
                <TableHead className="text-right">Holdings</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Cost Basis</TableHead>
                <TableHead className="text-right">Unrealized Gain</TableHead>
                <TableHead className="text-right">YTD</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset, index) => {
                  const is24hPositive = asset.priceChangePercentage24h >= 0;
                  const isGainPositive = (asset.unrealizedGain || 0) >= 0;
                  const isYTDPositive = (asset.performanceYTD || 0) >= 0;
                  
                  return (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.type)}
                          <div>
                            <div className="font-semibold">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="text-sm">
                          {asset.holdings.toLocaleString('en-US', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4 
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <CurrencyDisplay
                          amount={asset.currentPrice}
                          currency={currency}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${is24hPositive ? 'text-success' : 'text-destructive'}`}>
                          {is24hPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span className="text-sm font-semibold">
                            {is24hPositive ? '+' : ''}{asset.priceChangePercentage24h.toFixed(2)}%
                          </span>
                        </div>
                        <div className={`text-xs ${is24hPositive ? 'text-success' : 'text-destructive'}`}>
                          {is24hPositive ? '+' : ''}
                          <CurrencyDisplay
                            amount={asset.priceChange24h}
                            currency={currency}
                            className="text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset.sector ? (
                          <Badge variant="outline" className="text-xs">
                            {asset.sector}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {asset.costBasis !== undefined ? (
                          <CurrencyDisplay
                            amount={asset.costBasis}
                            currency={currency}
                            className="text-sm text-muted-foreground"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.unrealizedGain !== undefined ? (
                          <>
                            <div className={`text-sm font-semibold ${isGainPositive ? 'text-success' : 'text-destructive'}`}>
                              {isGainPositive ? '+' : ''}
                              <CurrencyDisplay
                                amount={asset.unrealizedGain}
                                currency={currency}
                                className="text-sm"
                              />
                            </div>
                            {asset.unrealizedGainPercent !== undefined && (
                              <div className={`text-xs ${isGainPositive ? 'text-success' : 'text-destructive'}`}>
                                {isGainPositive ? '+' : ''}{asset.unrealizedGainPercent.toFixed(2)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.performanceYTD !== undefined ? (
                          <>
                            <div className={`flex items-center justify-end gap-1 ${isYTDPositive ? 'text-success' : 'text-destructive'}`}>
                              {isYTDPositive ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <span className="text-sm font-semibold">
                                {isYTDPositive ? '+' : ''}{asset.performanceYTD.toFixed(2)}%
                              </span>
                            </div>
                            {asset.performanceYTDAmount !== undefined && (
                              <div className={`text-xs ${isYTDPositive ? 'text-success' : 'text-destructive'}`}>
                                {isYTDPositive ? '+' : ''}
                                <CurrencyDisplay
                                  amount={asset.performanceYTDAmount}
                                  currency={currency}
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-medium">{asset.allocation.toFixed(2)}%</div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${Math.min(asset.allocation, 100)}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
