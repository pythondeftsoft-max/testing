
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketDataPoint {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap?: number;
  volume24h?: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  marketStatus: 'open' | 'closed' | 'pre_market' | 'after_hours';
  lastUpdated: string;
  dataSource: string;
  stale?: boolean;
}

export interface UseMarketDataReturn {
  fetchMarketData: (symbol: string, assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity', forceRefresh?: boolean) => Promise<MarketDataPoint | null>;
  isLoading: boolean;
  error: string | null;
}

export const useMarketData = (): UseMarketDataReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMarketData = useCallback(async (
    symbol: string, 
    assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity',
    forceRefresh = false
  ): Promise<MarketDataPoint | null> => {
    if (!symbol?.trim()) {
      const errorMsg = 'Symbol is required';
      setError(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-market-data', {
        body: {
          symbol: symbol.trim().toUpperCase(),
          assetType,
          forceRefresh
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch market data');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid response from market data service');
      }

      if (data.warning) {
        toast({
          title: "Warning",
          description: data.warning,
          variant: "default",
        });
      }

      return data.data as MarketDataPoint;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      setError(errorMessage);
      
      toast({
        title: "Market Data Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    fetchMarketData,
    isLoading,
    error
  };
};

// Helper hook for batch fetching multiple symbols
export const useBatchMarketData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchBatchMarketData = useCallback(async (
    requests: Array<{ symbol: string; assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity' }>
  ): Promise<Record<string, MarketDataPoint>> => {
    setIsLoading(true);
    setErrors({});

    const results: Record<string, MarketDataPoint> = {};
    const batchErrors: Record<string, string> = {};

    // Process requests in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const promises = batch.map(async ({ symbol, assetType }) => {
        try {
          const { data, error: functionError } = await supabase.functions.invoke('fetch-market-data', {
            body: { symbol: symbol.trim().toUpperCase(), assetType, forceRefresh: false }
          });

          if (functionError || !data?.success) {
            throw new Error(functionError?.message || data?.error || 'Failed to fetch data');
          }

          results[symbol.toUpperCase()] = data.data;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          batchErrors[symbol.toUpperCase()] = errorMsg;
        }
      });

      await Promise.all(promises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setErrors(batchErrors);
    setIsLoading(false);

    if (Object.keys(batchErrors).length > 0) {
      toast({
        title: "Some Market Data Failed",
        description: `Failed to fetch data for ${Object.keys(batchErrors).length} symbols`,
        variant: "destructive",
      });
    }

    return results;
  }, [toast]);

  return {
    fetchBatchMarketData,
    isLoading,
    errors
  };
};
