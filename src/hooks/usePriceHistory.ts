
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PriceHistoryPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistoryData {
  symbol: string;
  range: string;
  interval: string;
  priceHistory: PriceHistoryPoint[];
  dataSource: string;
  lastUpdated: string;
}

export const usePriceHistory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPriceHistory = useCallback(async (
    symbol: string,
    assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity',
    range: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'YTD' | 'MAX' = '1M',
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo' = '1d'
  ): Promise<PriceHistoryData | null> => {
    if (!symbol?.trim()) {
      setError('Symbol is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching price history for ${symbol}: ${range} ${interval}`);

      // Step 1: Check cached data first using new RPC
      const minDateTime = getMinDateTimeForRange(range);
      // Call RPC with loose typing and normalize to array
      const { data: rpcData, error: cacheError } = await (supabase as any).rpc('get_cached_price_history', {
        p_symbol: symbol.toUpperCase(),
        p_interval: interval,
        p_min_date_time: minDateTime.toISOString(),
        p_limit: 5000
      });

      if (cacheError) {
        console.error('Cache lookup error:', cacheError);
      }

      // Normalize RPC result to an array for safe usage
      const cachedData: any[] = Array.isArray(rpcData) ? rpcData : [];

      // Check if cached data is sufficient
      const isCachedDataSufficient = cachedData.length > 0 &&
        isDataFreshEnough(cachedData, range);

      if (isCachedDataSufficient) {
        console.log(`Using cached data: ${cachedData.length} points for ${symbol}`);
        
        const priceHistory = cachedData.map((point: any) => ({
          timestamp: point.timestamp,
          open: point.open || 0,
          high: point.high || 0,
          low: point.low || 0,
          close: point.close || 0,
          volume: Number(point.volume) || 0
        }));

        return {
          symbol: symbol.toUpperCase(),
          range,
          interval,
          priceHistory,
          dataSource: 'cache',
          lastUpdated: new Date().toISOString()
        };
      }

      // Step 2: Fetch fresh data from Edge Function if cache is insufficient
      console.log(`Cache insufficient, fetching fresh data for ${symbol}`);
      const { data: response, error: functionError } = await supabase.functions
        .invoke('fetch-price-history', {
          body: { symbol: symbol.trim().toUpperCase(), assetType, range, interval }
        });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch price history');
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Invalid response from price history service');
      }

      return response.data as PriceHistoryData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price history';
      setError(errorMessage);
      
      toast({
        title: "Price History Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    fetchPriceHistory,
    isLoading,
    error
  };
};

function getMinDateTimeForRange(range: string): Date {
  const now = new Date();
  const rangeToDays: Record<string, number> = {
    '1D': 1,
    '5D': 5,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '2Y': 730,
    '5Y': 1825,
    'YTD': Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
    'MAX': 3650 // ~10 years
  };
  
  const days = rangeToDays[range] || 30;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}

function isDataFreshEnough(cachedData: any[], range: string): boolean {
  if (!cachedData || cachedData.length === 0) return false;
  
  const latestPoint = new Date(cachedData[cachedData.length - 1].timestamp);
  const now = new Date();
  const hoursSinceLatest = (now.getTime() - latestPoint.getTime()) / (1000 * 60 * 60);
  
  // Consider data fresh if it's less than 6 hours old for most ranges
  const freshnessThreshold = range === '1D' ? 1 : 6;
  return hoursSinceLatest < freshnessThreshold;
}
