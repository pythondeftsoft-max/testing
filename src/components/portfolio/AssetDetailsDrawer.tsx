import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { AssetInviteForm } from '@/components/AssetInviteForm';
import { AssetInvitationsList } from '@/components/AssetInvitationsList';
import type { UserAsset } from '@/hooks/useUserAssets';

interface AssetDetailsDrawerProps {
  asset: UserAsset;
  marketData?: {
    currentPrice: number;
    priceChange24h?: number;
    priceChangePercentage24h?: number;
    dayHigh?: number;
    dayLow?: number;
    previousClose?: number;
    marketCap?: number;
    volume24h?: number;
    lastUpdated: string;
    dataSource: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

type TimeRange = '1D' | '1M' | '6M' | '1Y' | 'YTD';

export const AssetDetailsDrawer = ({ asset, marketData, isOpen, onClose }: AssetDetailsDrawerProps) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const { fetchPriceHistory, isLoading: isPriceLoading } = usePriceHistory();
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  const hasMarketData = Boolean(asset.metadata?.symbol && marketData);
  const shares = asset.metadata?.shares ? Number(asset.metadata.shares) : 1;
  const costBasis = asset.acquisition_cost || asset.asset_value || 0;
  const currentValue = hasMarketData && marketData ? marketData.currentPrice * shares : (asset.current_value || asset.asset_value || 0);
  const unrealizedPL = currentValue - costBasis;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

  // Load price history when range changes
  const loadPriceHistory = async (range: TimeRange) => {
    if (!asset.metadata?.symbol) return;
    
    try {
      const data = await fetchPriceHistory(
        asset.metadata.symbol as string,
        (asset.metadata.asset_type as any) || 'stock',
        range,
        '1d'
      );
      setPriceHistory(data?.priceHistory || []);
    } catch (error) {
      console.error('Failed to load price history:', error);
      setPriceHistory([]);
    }
  };

  // Load initial data
  useState(() => {
    if (hasMarketData) {
      loadPriceHistory(selectedRange);
    }
  });

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    loadPriceHistory(range);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">{asset.asset_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={`bg-${asset.category_color_theme}-100 text-${asset.category_color_theme}-800`}>
                {asset.category_display_name}
              </Badge>
              {asset.metadata?.symbol && (
                <Badge variant="outline">{asset.metadata.symbol}</Badge>
              )}
              {asset.metadata?.asset_type && (
                <Badge variant="outline">{asset.metadata.asset_type}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
                <AssetInviteForm 
                  assetId={asset.id} 
                  assetName={asset.asset_name}
                  assetCategory={asset.category_name || ''}
                  commercialSubtype={asset.metadata?.commercial_subtype}
                />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
                {shares > 1 && hasMarketData && marketData && (
                  <p className="text-xs text-muted-foreground">
                    {shares} × {formatCurrency(marketData.currentPrice)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cost Basis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(costBasis)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unrealized P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(unrealizedPL))}
                </div>
                <p className={`text-xs ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {unrealizedPL >= 0 ? '+' : '-'}{Math.abs(unrealizedPLPercent).toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Annual Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(asset.annual_income || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Data Section */}
          {hasMarketData && marketData && (
            <>
              {/* Market Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">24h Change</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {marketData.priceChangePercentage24h !== undefined ? (
                      <div className={`text-lg font-bold flex items-center gap-1 ${
                        marketData.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {marketData.priceChangePercentage24h >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {Math.abs(marketData.priceChangePercentage24h).toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-muted-foreground">-</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Day High</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {marketData.dayHigh ? formatCurrency(marketData.dayHigh) : '-'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Day Low</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {marketData.dayLow ? formatCurrency(marketData.dayLow) : '-'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {marketData.volume24h ? marketData.volume24h.toLocaleString() : '-'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Price Chart
                    </CardTitle>
                    <div className="flex gap-1">
                      {(['1D', '1M', '6M', '1Y', 'YTD'] as TimeRange[]).map(range => (
                        <Button
                          key={range}
                          variant={selectedRange === range ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRangeChange(range)}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isPriceLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-muted-foreground">Loading chart...</div>
                    </div>
                  ) : priceHistory.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceHistory}>
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis domain={['dataMin', 'dataMax']} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value: number) => [formatCurrency(value), 'Price']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="close" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-muted-foreground">No chart data available</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Source Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last updated: {new Date(marketData.lastUpdated).toLocaleString()}
                <span className="mx-2">•</span>
                Source: {marketData.dataSource}
              </div>
            </>
          )}

          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset.asset_description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-muted-foreground">{asset.asset_description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Acquisition Date</h4>
                  <p className="text-muted-foreground">
                    {asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString() : 'Not specified'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Last Updated</h4>
                  <p className="text-muted-foreground">
                    {new Date(asset.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {asset.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex gap-1 flex-wrap">
                    {asset.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetInvitationsList assetId={asset.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};