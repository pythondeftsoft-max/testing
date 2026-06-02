import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketDataPoint {
  symbol: string;
  currentPrice: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  marketCap?: number;
  volume24h?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  marketStatus: 'open' | 'closed' | 'unknown';
  lastUpdated: string;
  dataSource: string;
}

export const useMarketDataQuery = (symbol?: string, assetType?: string, externalId?: string) => {
  return useQuery({
    queryKey: ['market-data', symbol, assetType, externalId],
    queryFn: async (): Promise<MarketDataPoint> => {
      if (!symbol) {
        throw new Error('Symbol is required');
      }

      console.log(`Fetching market data for ${symbol} (${assetType})`);
      
      const { data, error } = await supabase.functions.invoke('fetch-market-data', {
        body: { symbol, assetType, externalId }
      });

      if (error) {
        console.error('Error fetching market data:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch market data');
      }

      return data.data;
    },
    enabled: !!symbol,
    staleTime: 60000, // 1 minute
    retry: 2,
  });
};