import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSymbolSearch, SymbolSearchResult } from '@/hooks/useSymbolSearch';
import { WizardData } from '../AddAssetWizard';
import { Search, Loader2, TrendingUp, Bitcoin, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface InlineSymbolSearchProps {
  wizardData: WizardData;
  onDataChange: (updates: Partial<WizardData>) => void;
}

export const InlineSymbolSearch: React.FC<InlineSymbolSearchProps> = ({
  wizardData,
  onDataChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const { searchSymbols, isLoading } = useSymbolSearch();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery.length >= 1) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  const handleSearch = async () => {
    if (!debouncedSearchQuery.trim()) return;

    const assetTypes = wizardData.selectedCategory?.name === 'stocks' 
      ? ['stock', 'etf'] 
      : ['cryptocurrency'];
    
    const response = await searchSymbols(debouncedSearchQuery, assetTypes as any, 5);
    if (response?.results) {
      const enrichedResults = await enrichWithMarketData(response.results);
      setSearchResults(enrichedResults);
    }
  };

  const enrichWithMarketData = async (results: SymbolSearchResult[]): Promise<SymbolSearchResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('batch-market-data', {
        body: {
          requests: results.map(r => ({
            symbol: r.symbol,
            assetType: r.assetType === 'crypto' ? 'cryptocurrency' : r.assetType,
            externalId: r.externalId
          }))
        }
      });

      if (error || !data?.success) {
        return results;
      }

      return results.map(result => {
        // Access the object directly by symbol key (results is an object, not array)
        const marketData = data.results?.[result.symbol];
        
        if (marketData) {
          return {
            ...result,
            currentPrice: marketData.currentPrice,
            priceChange24h: marketData.priceChange24h,
            priceChangePercentage24h: marketData.priceChangePercentage24h,
            marketCap: marketData.marketCap
          };
        }
        return result;
      });
    } catch (err) {
      return results;
    }
  };

  // Auto-detect crypto subcategory based on symbol
  const detectCryptoSubcategory = (symbol: string, displayName: string): string => {
    const lowerSymbol = symbol.toLowerCase();
    const lowerName = displayName.toLowerCase();
    
    if (lowerSymbol === 'btc' || lowerName === 'bitcoin') return 'bitcoin';
    if (lowerSymbol === 'eth' || lowerName === 'ethereum') return 'ethereum';
    if (lowerName.includes('usd') || lowerSymbol.includes('usd') || 
        ['usdt', 'usdc', 'dai', 'busd', 'tusd'].includes(lowerSymbol)) {
      return 'stablecoin';
    }
    return 'altcoin'; // Default for all other cryptos
  };

  const handleSymbolSelect = (symbol: SymbolSearchResult) => {
    const isCrypto = wizardData.selectedCategory?.name === 'crypto';
    // If user manually selected a subcategory, use that; otherwise auto-detect
    const subcategory = isCrypto 
      ? (wizardData.selectedSubcategory || detectCryptoSubcategory(symbol.symbol, symbol.displayName))
      : undefined;
    
    onDataChange({ 
      selectedSymbol: symbol,
      assetName: symbol.displayName,
      ...(isCrypto && { selectedSubcategory: subcategory }),
      metadata: {
        ...wizardData.metadata,
        symbol: symbol.symbol,
        exchange: symbol.exchange,
        asset_type: symbol.assetType,
        data_source: symbol.dataSource,
        external_id: symbol.externalId,
        ...(isCrypto && { subcategory })
      }
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    onDataChange({ 
      selectedSymbol: undefined,
      assetName: '',
      metadata: {
        ...wizardData.metadata,
        symbol: undefined,
        exchange: undefined,
        data_source: undefined,
        external_id: undefined
      }
    });
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case 'crypto':
        return <Bitcoin className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getAssetTypeBadgeColor = (assetType: string) => {
    switch (assetType) {
      case 'stock':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'etf':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'crypto':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (wizardData.selectedSymbol) {
    return (
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-4 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="absolute top-2 right-2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 pr-8">
            {getAssetTypeIcon(wizardData.selectedSymbol.assetType)}
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {wizardData.selectedSymbol.symbol}
                <Badge variant="outline" className="text-xs">Selected</Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {wizardData.selectedSymbol.displayName}
              </div>
              
              {wizardData.selectedSymbol.currentPrice !== undefined && (
                <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                  <span className="font-semibold text-base">
                    ${wizardData.selectedSymbol.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  
                  {wizardData.selectedSymbol.priceChangePercentage24h !== undefined && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className={
                        wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }>
                        {wizardData.selectedSymbol.priceChangePercentage24h >= 0 ? '+' : ''}
                        {wizardData.selectedSymbol.priceChangePercentage24h.toFixed(2)}%
                      </span>
                    </>
                  )}
                  
                  {wizardData.selectedSymbol.marketCap !== undefined && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Market Cap: ${(wizardData.selectedSymbol.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search for ${wizardData.selectedCategory?.name === 'stocks' ? 'stocks, ETFs' : 'cryptocurrencies'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {searchResults.map((result, index) => (
            <Card
              key={`${result.symbol}-${index}`}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary"
              onClick={() => handleSymbolSelect(result)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getAssetTypeIcon(result.assetType)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{result.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">{result.displayName}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {result.currentPrice !== undefined && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          ${result.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {result.priceChangePercentage24h !== undefined && (
                          <div className={`text-xs ${
                            result.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.priceChangePercentage24h >= 0 ? '+' : ''}
                            {result.priceChangePercentage24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Badge className={getAssetTypeBadgeColor(result.assetType)}>
                      {result.assetType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchQuery.length >= 1 && !isLoading && searchResults.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No results found for "{searchQuery}"
        </div>
      )}
    </div>
  );
};
