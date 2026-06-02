import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SymbolSearchResult {
  symbol: string;
  displayName: string;
  assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity' | 'index';
  exchange?: string;
  externalId?: string;
  dataSource: string;
  currentPrice?: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  marketCap?: number;
}

export interface SymbolSearchResponse {
  query: string;
  results: SymbolSearchResult[];
  totalFound: number;
}

export const useSymbolSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const searchSymbols = useCallback(async (
    query: string,
    assetTypes: ('stock' | 'crypto' | 'etf' | 'bond' | 'commodity')[] = ['stock', 'crypto', 'etf'],
    limit: number = 20
  ): Promise<SymbolSearchResponse | null> => {
    if (!query?.trim() || query.trim().length < 1) {
      setError('Query must be at least 1 character');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: functionError } = await supabase.functions
        .invoke('search-symbols', {
          body: { 
            query: query.trim(), 
            assetTypes, 
            limit 
          }
        });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to search symbols');
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Invalid response from symbol search service');
      }

      return response.data as SymbolSearchResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search symbols';
      setError(errorMessage);
      
      toast({
        title: "Symbol Search Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    searchSymbols,
    isLoading,
    error
  };
};