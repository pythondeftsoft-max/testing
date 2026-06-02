import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MARKET_DATA_KEYS } from '@/lib/queryKeys';
import type { UserAsset } from '@/hooks/useUserAssets';

interface MarketDataPoint {
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

interface MarketDataRequest {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity';
}

interface BatchMarketDataResponse {
  success: boolean;
  results: Record<string, MarketDataPoint>;
  errors?: Record<string, string>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface UsePortfolioMarketDataOptions {
  refetchInterval?: number; // in seconds, 0 to disable
  enabled?: boolean;
}

export const usePortfolioMarketData = (
  assets: UserAsset[] | undefined,
  options: UsePortfolioMarketDataOptions = {}
) => {
  const { toast } = useToast();
  const { refetchInterval = 0, enabled = true } = options;

  // Extract market symbols from assets
  const marketRequests: MarketDataRequest[] = (assets || [])
    .filter(asset => asset.metadata?.symbol && asset.metadata?.asset_type)
    .map(asset => ({
      symbol: asset.metadata.symbol as string,
      assetType: (asset.metadata.asset_type as string) as MarketDataRequest['assetType'],
    }));

  const portfolioId = assets?.[0]?.portfolio_id || 'everything';

  return useQuery({
    queryKey: MARKET_DATA_KEYS.portfolio(portfolioId),
    queryFn: async (): Promise<Record<string, MarketDataPoint>> => {
      if (marketRequests.length === 0) {
        return {};
      }

      console.log(`Fetching market data for ${marketRequests.length} symbols`);

      const { data, error } = await supabase.functions.invoke('batch-market-data', {
        body: { requests: marketRequests },
      });

      if (error) {
        console.error('Error fetching batch market data:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch market data');
      }

      const response = data as BatchMarketDataResponse;

      // Show toast for partial failures
      if (response.errors && Object.keys(response.errors).length > 0) {
        const failedCount = Object.keys(response.errors).length;
        toast({
          title: "Partial Market Data Update",
          description: `${response.summary.successful} successful, ${failedCount} failed to update`,
          variant: "default",
        });
      }

      return response.results;
    },
    enabled: enabled && marketRequests.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: refetchInterval > 0 ? refetchInterval * 1000 : false,
    retry: 2,
  });
};