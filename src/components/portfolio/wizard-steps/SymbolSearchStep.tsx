import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSymbolSearch, SymbolSearchResult } from '@/hooks/useSymbolSearch';
import { WizardData } from '../AddAssetWizard';
import { Search, Loader2, TrendingUp, Bitcoin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';

interface SymbolSearchStepProps {
  wizardData: WizardData;
  onDataChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const SymbolSearchStep: React.FC<SymbolSearchStepProps> = ({
  wizardData,
  onDataChange,
  onNext,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const { searchSymbols, isLoading } = useSymbolSearch();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  // Clear selected symbol if subcategory has changed
  useEffect(() => {
    // If there's a selected symbol but we're now searching in a different context,
    // clear the selection to prevent confusion
    if (wizardData.selectedSymbol && wizardData.selectedSubcategory) {
      const symbolCategory = wizardData.selectedSymbol.assetType;
      const currentCategory = wizardData.selectedCategory?.name;
      
      // Check if symbol category matches current category
      const isValidSymbol = 
        (currentCategory === 'crypto' && symbolCategory === 'crypto') ||
        (currentCategory === 'stocks' && ['stock', 'etf'].includes(symbolCategory));
      
      if (!isValidSymbol) {
        console.log('⚠️ Clearing mismatched symbol:', wizardData.selectedSymbol.symbol);
        onDataChange({ 
          selectedSymbol: undefined,
          metadata: {}
        });
        setSearchResults([]);
        setSearchQuery('');
      }
    }
  }, [wizardData.selectedCategory, wizardData.selectedSubcategory]);

  const handleSearch = async () => {
    if (!debouncedSearchQuery.trim()) return;

    const assetTypes = wizardData.selectedCategory?.name === 'stocks' 
      ? ['stock', 'etf'] 
      : ['cryptocurrency'];
    
    const response = await searchSymbols(debouncedSearchQuery, assetTypes as any, 10);
    if (response?.results) {
      // Fetch market data for all results
      const enrichedResults = await enrichWithMarketData(response.results);
      setSearchResults(enrichedResults);
    }
  };

  const enrichWithMarketData = async (results: SymbolSearchResult[]): Promise<SymbolSearchResult[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('batch-market-data', {
        body: {
          symbols: results.map(r => ({
            symbol: r.symbol,
            assetType: r.assetType === 'crypto' ? 'cryptocurrency' : r.assetType,
            externalId: r.externalId
          }))
        }
      });

      if (error || !data?.success) {
        console.warn('Failed to fetch market data for search results');
        return results;
      }

      // Merge market data with search results
      return results.map(result => {
        const marketData = data.results?.find((md: any) => 
          md.symbol.toLowerCase() === result.symbol.toLowerCase()
        );
        
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
      console.warn('Error enriching search results with market data:', err);
      return results;
    }
  };

  const handleSymbolSelect = (symbol: SymbolSearchResult) => {
    onDataChange({ 
      selectedSymbol: symbol,
      assetName: symbol.displayName,
      metadata: {
        symbol: symbol.symbol,
        exchange: symbol.exchange,
        asset_type: symbol.assetType,
        data_source: symbol.dataSource,
        external_id: symbol.externalId
      }
    });
  };

  const handleSkip = () => {
    onDataChange({ selectedSymbol: undefined });
    onNext();
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
        return 'bg-blue-100 text-blue-700';
      case 'etf':
        return 'bg-green-100 text-green-700';
      case 'crypto':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Search for {wizardData.selectedCategory?.display_name}</h3>
        <p className="text-muted-foreground">
          Search for your {wizardData.selectedCategory?.name === 'stocks' ? 'stock or ETF' : 'cryptocurrency'} symbol to automatically populate details.
        </p>
      </div>

      <div className="space-y-4">
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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((result, index) => (
              <Card
                key={`${result.symbol}-${index}`}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  wizardData.selectedSymbol?.symbol === result.symbol ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => handleSymbolSelect(result)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getAssetTypeIcon(result.assetType)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{result.symbol}</div>
                        <div className="text-sm text-muted-foreground truncate">{result.displayName}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {result.currentPrice !== undefined && (
                        <div className="text-right">
                          <div className="font-semibold">
                            ${result.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {result.priceChangePercentage24h !== undefined && (
                            <div className={`text-sm font-medium ${
                              result.priceChangePercentage24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {result.priceChangePercentage24h >= 0 ? '+' : ''}
                              {result.priceChangePercentage24h.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1">
                        <Badge className={getAssetTypeBadgeColor(result.assetType)}>
                          {result.assetType.toUpperCase()}
                        </Badge>
                        {result.exchange && (
                          <Badge variant="outline" className="text-xs">
                            {result.exchange}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !isLoading && searchResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No results found for "{searchQuery}". You can skip this step to add manually.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip & Add Manually
          </Button>
          <Button onClick={onNext} disabled={!wizardData.selectedSymbol}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};