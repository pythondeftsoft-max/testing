import { useState, useEffect, useCallback } from 'react';
import { useMarketData, type MarketDataPoint } from './useMarketData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface RealTimeMarketData {
  id: string;
  assetId: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap?: number;
  volume24h: number;
  dayHigh: number;
  dayLow: number;
  marketStatus: 'open' | 'closed' | 'pre_market' | 'after_hours';
  lastUpdated: string;
  dataSource: string;
}

export interface AssetMarketAnalysis {
  symbol: string;
  currentPrice: number;
  targetPrice?: number;
  analystRating?: 'buy' | 'hold' | 'sell';
  volatility: number;
  beta?: number;
  peRatio?: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  supportLevel: number;
  resistanceLevel: number;
}

export interface PortfolioMarketIntelligence {
  totalValue: number;
  totalChange24h: number;
  totalChangePercentage24h: number;
  assetAnalyses: AssetMarketAnalysis[];
  marketSummary: {
    topGainer: AssetMarketAnalysis | null;
    topLoser: AssetMarketAnalysis | null;
    mostVolatile: AssetMarketAnalysis | null;
    averageVolatility: number;
  };
  lastUpdated: string;
}

export const useRealTimeMarketIntelligence = (portfolioId?: string) => {
  const [marketData, setMarketData] = useState<RealTimeMarketData[]>([]);
  const [portfolioIntelligence, setPortfolioIntelligence] = useState<PortfolioMarketIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const { fetchMarketData } = useMarketData();
  const { toast } = useToast();

  // Fetch portfolio assets and their market data
  const fetchPortfolioMarketData = useCallback(async () => {
    if (!portfolioId) return;

    setIsLoading(true);
    try {
      // Get portfolio assets with symbols - fix the query to use existing columns
      const { data: assets, error: assetsError } = await supabase
        .from('portfolio_assets')
        .select('id, asset_name, metadata, asset_category_id, current_value, acquisition_cost')
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true);

      if (assetsError) throw assetsError;

      if (!assets || assets.length === 0) {
        setMarketData([]);
        setPortfolioIntelligence(null);
        return;
      }

      // Extract symbols and fetch market data
      const marketDataPromises = assets
        .filter(asset => {
          // Safely check if metadata contains symbol or ticker
          const metadata = asset.metadata as Record<string, any> | null;
          return metadata && (metadata.symbol || metadata.ticker);
        })
        .map(async (asset) => {
          const metadata = asset.metadata as Record<string, any>;
          const symbol = (metadata.symbol || metadata.ticker) as string;
          const assetType = (metadata.asset_type || 'stock') as 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity';
          
          const marketInfo = await fetchMarketData(symbol, assetType);
          
          if (marketInfo) {
            // Create a default data source ID (we'll need to handle this properly later)
            const defaultDataSourceId = '00000000-0000-0000-0000-000000000000';
            
            // Update asset market data in database - fix the upsert to include required fields
            await supabase
              .from('asset_market_data')
              .upsert({
                asset_id: asset.id,
                data_source_id: defaultDataSourceId,
                symbol: marketInfo.symbol,
                current_price: marketInfo.currentPrice,
                price_change_24h: marketInfo.priceChange24h,
                price_change_percentage_24h: marketInfo.priceChangePercentage24h,
                market_cap: marketInfo.marketCap,
                volume_24h: marketInfo.volume24h,
                day_high: marketInfo.dayHigh,
                day_low: marketInfo.dayLow,
                previous_close: marketInfo.previousClose,
                market_status: marketInfo.marketStatus,
                data_source: marketInfo.dataSource,
                last_updated: marketInfo.lastUpdated,
                auto_update_enabled: true
              });

            return {
              id: crypto.randomUUID(),
              assetId: asset.id,
              symbol: marketInfo.symbol,
              currentPrice: marketInfo.currentPrice,
              priceChange24h: marketInfo.priceChange24h,
              priceChangePercentage24h: marketInfo.priceChangePercentage24h,
              marketCap: marketInfo.marketCap,
              volume24h: marketInfo.volume24h || 0,
              dayHigh: marketInfo.dayHigh,
              dayLow: marketInfo.dayLow,
              marketStatus: marketInfo.marketStatus,
              lastUpdated: marketInfo.lastUpdated,
              dataSource: marketInfo.dataSource
            } as RealTimeMarketData;
          }
          return null;
        });

      const marketDataResults = await Promise.all(marketDataPromises);
      const validMarketData = marketDataResults.filter(Boolean) as RealTimeMarketData[];
      
      setMarketData(validMarketData);

      // Generate portfolio intelligence
      const intelligence = generatePortfolioIntelligence(validMarketData, assets);
      setPortfolioIntelligence(intelligence);

    } catch (error) {
      console.error('Error fetching portfolio market data:', error);
      toast({
        title: "Market Data Error",
        description: "Failed to fetch real-time market data for portfolio assets.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, fetchMarketData, toast]);

  // Generate portfolio intelligence analysis
  const generatePortfolioIntelligence = (marketData: RealTimeMarketData[], assets: any[]): PortfolioMarketIntelligence => {
    const assetAnalyses: AssetMarketAnalysis[] = marketData.map(data => {
      const volatility = Math.abs(data.priceChangePercentage24h) / 100;
      const supportLevel = data.dayLow * 0.98;
      const resistanceLevel = data.dayHigh * 1.02;
      
      let marketTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (data.priceChangePercentage24h > 2) marketTrend = 'bullish';
      else if (data.priceChangePercentage24h < -2) marketTrend = 'bearish';

      return {
        symbol: data.symbol,
        currentPrice: data.currentPrice,
        volatility,
        marketTrend,
        supportLevel,
        resistanceLevel
      };
    });

    // Calculate portfolio totals
    const totalValue = marketData.reduce((sum, data) => sum + data.currentPrice, 0);
    const totalChange24h = marketData.reduce((sum, data) => sum + data.priceChange24h, 0);
    const totalChangePercentage24h = totalValue > 0 ? (totalChange24h / (totalValue - totalChange24h)) * 100 : 0;

    // Find top/bottom performers
    const sortedByChange = [...assetAnalyses].sort((a, b) => {
      const aChange = marketData.find(m => m.symbol === a.symbol)?.priceChangePercentage24h || 0;
      const bChange = marketData.find(m => m.symbol === b.symbol)?.priceChangePercentage24h || 0;
      return bChange - aChange;
    });

    const sortedByVolatility = [...assetAnalyses].sort((a, b) => b.volatility - a.volatility);
    const averageVolatility = assetAnalyses.reduce((sum, analysis) => sum + analysis.volatility, 0) / assetAnalyses.length;

    return {
      totalValue,
      totalChange24h,
      totalChangePercentage24h,
      assetAnalyses,
      marketSummary: {
        topGainer: sortedByChange[0] || null,
        topLoser: sortedByChange[sortedByChange.length - 1] || null,
        mostVolatile: sortedByVolatility[0] || null,
        averageVolatility
      },
      lastUpdated: new Date().toISOString()
    };
  };

  // Auto-refresh market data
  useEffect(() => {
    if (!autoRefreshEnabled || !portfolioId) return;

    const interval = setInterval(() => {
      fetchPortfolioMarketData();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, portfolioId, fetchPortfolioMarketData]);

  // Initial fetch
  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioMarketData();
    }
  }, [portfolioId, fetchPortfolioMarketData]);

  const refreshMarketData = useCallback(() => {
    fetchPortfolioMarketData();
  }, [fetchPortfolioMarketData]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev);
  }, []);

  return {
    marketData,
    portfolioIntelligence,
    isLoading,
    autoRefreshEnabled,
    refreshMarketData,
    toggleAutoRefresh,
    lastUpdated: portfolioIntelligence?.lastUpdated
  };
};
