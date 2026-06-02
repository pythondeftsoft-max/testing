
import React, { useState, useCallback } from 'react';
import { Search, TrendingUp, AlertCircle, CheckCircle, Bitcoin, Receipt, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMarketData, type MarketDataPoint } from '@/hooks/useMarketData';
import { formatCurrency } from '@/lib/utils';

interface SmartAssetCreatorProps {
  onAssetDataFound: (assetData: {
    symbol: string;
    name: string;
    assetType: string;
    currentPrice: number;
    marketData: MarketDataPoint;
  }) => void;
  onClose?: () => void;
}

export const SmartAssetCreator: React.FC<SmartAssetCreatorProps> = ({
  onAssetDataFound,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<'stock' | 'crypto' | 'etf' | 'bond' | 'commodity'>('stock');
  const [searchResults, setSearchResults] = useState<MarketDataPoint | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const { fetchMarketData, isLoading } = useMarketData();

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setSearchError(null);
    setSearchResults(null);

    try {
      const marketData = await fetchMarketData(searchTerm.trim(), selectedAssetType);
      
      if (marketData) {
        setSearchResults(marketData);
      } else {
        setSearchError('No data found for this symbol');
      }
    } catch (error) {
      setSearchError('Failed to fetch asset data');
    }
  }, [searchTerm, selectedAssetType, fetchMarketData]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectAsset = () => {
    if (!searchResults) return;

    onAssetDataFound({
      symbol: searchResults.symbol,
      name: generateAssetName(searchResults.symbol, selectedAssetType),
      assetType: selectedAssetType,
      currentPrice: searchResults.currentPrice,
      marketData: searchResults
    });
  };

  const generateAssetName = (symbol: string, type: string): string => {
    // In a real implementation, you'd have a lookup table or API call
    const commonNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'TSLA': 'Tesla Inc.',
      'AMZN': 'Amazon.com Inc.',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SPY': 'SPDR S&P 500 ETF',
      'QQQ': 'Invesco QQQ Trust'
    };

    return commonNames[symbol.toUpperCase()] || `${symbol.toUpperCase()} ${type.toUpperCase()}`;
  };

  const assetTypes = [
    { value: 'stock', label: 'Stock', icon: TrendingUp },
    { value: 'crypto', label: 'Cryptocurrency', icon: Bitcoin },
    { value: 'etf', label: 'ETF', icon: TrendingUp },
    { value: 'bond', label: 'Bond', icon: Receipt },
    { value: 'commodity', label: 'Commodity', icon: Package }
  ] as const;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Smart Asset Discovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Asset Type Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Asset Type</label>
          <div className="flex flex-wrap gap-2">
            {assetTypes.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={selectedAssetType === value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssetType(value)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Symbol Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Symbol or Ticker
          </label>
          <div className="flex gap-2">
            <Input
              placeholder={
                selectedAssetType === 'crypto' 
                  ? 'e.g., bitcoin, ethereum' 
                  : selectedAssetType === 'commodity'
                  ? 'e.g., GC=F (gold), SI=F (silver), CL=F (oil)'
                  : selectedAssetType === 'bond'
                  ? 'e.g., TLT, IEF, LQD (bond ETFs)'
                  : 'e.g., AAPL, GOOGL'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {selectedAssetType === 'commodity' && (
            <p className="text-xs text-muted-foreground mt-1">
              Tip: Futures symbols end with =F (Gold: GC=F, Silver: SI=F, Oil: CL=F, Wheat: ZW=F)
            </p>
          )}
          {selectedAssetType === 'bond' && (
            <p className="text-xs text-muted-foreground mt-1">
              Tip: Use bond ETF tickers (Treasury: TLT, IEF, SHY | Corporate: LQD, HYG)
            </p>
          )}
        </div>

        {/* Search Error */}
        {searchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResults && (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{searchResults.symbol}</h3>
                  <p className="text-sm text-muted-foreground">
                    {generateAssetName(searchResults.symbol, selectedAssetType)}
                  </p>
                </div>
                <Badge 
                  variant={searchResults.marketStatus === 'open' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {searchResults.marketStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(searchResults.currentPrice)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">24h Change</div>
                  <div className={`text-lg font-semibold ${
                    searchResults.priceChangePercentage24h >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {searchResults.priceChangePercentage24h >= 0 ? '+' : ''}
                    {searchResults.priceChangePercentage24h.toFixed(2)}%
                  </div>
                </div>

                {searchResults.volume24h && (
                  <div>
                    <div className="text-sm text-muted-foreground">Volume</div>
                    <div className="text-lg font-semibold">
                      {searchResults.volume24h.toLocaleString()}
                    </div>
                  </div>
                )}

                {searchResults.marketCap && (
                  <div>
                    <div className="text-sm text-muted-foreground">Market Cap</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(searchResults.marketCap)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <CheckCircle className="h-4 w-4 text-success" />
                Data provided by {searchResults.dataSource}
                {searchResults.stale && (
                  <Badge variant="outline" className="text-xs">
                    Cached Data
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSelectAsset} className="flex-1">
                  Add to Portfolio
                </Button>
                {onClose && (
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
