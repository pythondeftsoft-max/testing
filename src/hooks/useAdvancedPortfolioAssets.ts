import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PortfolioAsset } from '@/types/portfolio-assets';

export interface EnhancedPortfolioAsset extends PortfolioAsset {
  portfolioName?: string;
  marketData?: {
    currentPrice: number;
    priceChange24h: number;
    priceChangePercentage24h: number;
    marketValue: number;
    costBasis: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
  };
}

interface PerformerData {
  symbol: string;
  changePercent: number;
  timeframe: string;
  currentPrice: number;
  quantity: number;
  totalValue: number;
  acquisitionCost: number;
  gainLossAmount: number;
  assetType: string;
}

export interface HoldingsSummary {
  totalAssets: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalAnnualIncome: number;
  topMovers: PerformerData[];
  allocationByType: Record<string, number>;
}

export const useAdvancedPortfolioAssets = (portfolioId?: string) => {
  const [assets, setAssets] = useState<EnhancedPortfolioAsset[]>([]);
  const [holdingsSummary, setHoldingsSummary] = useState<HoldingsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAssets = useCallback(async () => {
    if (!portfolioId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let assetsData: EnhancedPortfolioAsset[] = [];

      if (portfolioId === 'everything') {
        // Use the new RPC for "Everything" mode
        const { data: userAssets, error: userAssetsError } = await (supabase as any)
          .rpc('get_user_accessible_assets', { 
            user_id_param: (await supabase.auth.getUser()).data.user?.id 
          });

        if (userAssetsError) throw userAssetsError;

        const userAssetsArray = (userAssets ?? []) as any[];
        assetsData = userAssetsArray.map((asset: any) => ({
          ...asset,
          portfolioName: asset.portfolio_name,
          asset_category: asset.asset_category ? JSON.parse(asset.asset_category) : null
        })) || [];
      } else {
        // Single portfolio mode with fallback strategy
        let portfolioAssets: any[] = [];
        let portfolioError: any = null;

        try {
          // Try direct table access first (should work now with fixed RLS)
          const { data, error } = await supabase
            .from('portfolio_assets')
            .select(`
              *,
              asset_categories (*)
            `)
            .eq('portfolio_id', portfolioId)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });

          if (error) {
            console.error('Direct table access error:', error);
            
            // Check if it's an RLS/permission error
            if (error.code === 'PGRST301' || error.message?.includes('permission denied') || 
                error.message?.includes('insufficient_privilege') || error.message?.includes('infinite recursion')) {
              
              // Fallback to RPC function for this specific portfolio
              const { data: userData } = await supabase.auth.getUser();
              const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_user_assets', { user_id_param: userData?.user?.id })
                .then(result => ({
                  data: result.data?.filter((asset: any) => asset.portfolio_id === portfolioId),
                  error: result.error
                }));

              if (rpcError) {
                throw new Error(`Failed to fetch assets: ${rpcError.message}`);
              }

              portfolioAssets = rpcData || [];
            } else {
              throw error;
            }
          } else {
            portfolioAssets = data || [];
          }
        } catch (err) {
          portfolioError = err;
        }

        if (portfolioError) throw portfolioError;

        assetsData = portfolioAssets?.map((asset: any) => ({
          ...asset,
          asset_category: asset.asset_categories || asset.asset_category
        })) || [];
      }

      // Fetch market data for assets with symbols
      const symbolAssets = assetsData.filter(asset => 
        asset.metadata && (asset.metadata.symbol || asset.metadata.ticker)
      );

      for (const asset of symbolAssets) {
        try {
          const symbol = asset.metadata.symbol || asset.metadata.ticker;
          const assetType = asset.metadata.asset_type || 'stock';
          const shares = parseFloat(asset.metadata.shares || '1');

          // Fetch current market data
          const { data: marketDataResponse, error: marketError } = await supabase.functions
            .invoke('fetch-market-data', {
              body: { symbol, assetType, forceRefresh: false }
            });

          if (!marketError && marketDataResponse?.success) {
            const marketInfo = marketDataResponse.data;
            const currentPrice = marketInfo.currentPrice || 0;
            const marketValue = currentPrice * shares;
            const costBasis = (asset.acquisition_cost || asset.asset_value || 0) * shares;
            const unrealizedPL = marketValue - costBasis;
            const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

            asset.marketData = {
              currentPrice,
              priceChange24h: marketInfo.priceChange24h || 0,
              priceChangePercentage24h: marketInfo.priceChangePercentage24h || 0,
              marketValue,
              costBasis,
              unrealizedPL,
              unrealizedPLPercent
            };
          }
        } catch (error) {
          console.error(`Error fetching market data for ${asset.asset_name}:`, error);
        }
      }

      setAssets(assetsData);

      // Fetch holdings summary
      await fetchHoldingsSummary(portfolioId);

    } catch (err) {
      console.error('Asset fetching error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assets';
      setError(errorMessage);
      
      // Show user-friendly error with retry option
      const isPermissionError = errorMessage.includes('permission') || 
                               errorMessage.includes('infinite recursion') ||
                               errorMessage.includes('RLS') ||
                               errorMessage.includes('PGRST301');
      
      toast({
        title: isPermissionError ? "Permission Error" : "Loading Error",
        description: isPermissionError ? 
          "Unable to access portfolio assets. This may be a permission issue." : 
          errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, toast]);

  const fetchHoldingsSummary = useCallback(async (portfolioId: string) => {
    try {
      const { data: summary, error } = await supabase.rpc('get_holdings_summary', {
        portfolio_id_param: portfolioId === 'everything' ? null : portfolioId,
        user_id_param: portfolioId === 'everything' ? (await supabase.auth.getUser()).data.user?.id : null
      });

      if (error) throw error;

      if (summary && summary.length > 0) {
        const summaryData = summary[0] as any;
        const topMovers = (summaryData.top_movers as any[]) || [];
        const allocationByType = (summaryData.allocation_by_type as any) || {};
        
        setHoldingsSummary({
          totalAssets: summaryData.total_assets || 0,
          totalMarketValue: summaryData.total_market_value || 0,
          totalCostBasis: summaryData.total_cost_basis || 0,
          totalUnrealizedPL: summaryData.total_unrealized_pl || 0,
          totalUnrealizedPLPercent: summaryData.total_unrealized_pl_percent || 0,
          totalAnnualIncome: summaryData.total_annual_income || 0,
          topMovers: topMovers.map((mover: any) => ({
            symbol: mover.symbol || '',
            changePercent: mover.change_percent || 0,
            timeframe: mover.timeframe || 'ytd',
            currentPrice: mover.current_price || 0,
            quantity: mover.quantity || 0,
            totalValue: mover.total_value || 0,
            acquisitionCost: mover.acquisition_cost || 0,
            gainLossAmount: mover.gain_loss_amount || 0,
            assetType: mover.asset_type || 'stock'
          })),
          allocationByType: allocationByType
        });
      }
    } catch (error) {
      console.error('Error fetching holdings summary:', error);
    }
  }, []);

  useEffect(() => {
    if (portfolioId) {
      fetchAssets();
    }
  }, [portfolioId, fetchAssets]);

  const refreshData = useCallback(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    holdingsSummary,
    isLoading,
    error,
    refreshData
  };
};