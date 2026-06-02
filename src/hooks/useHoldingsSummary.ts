import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { INTELLIGENCE_KEYS } from '@/lib/queryKeys';
import { generateMockAssets } from '@/utils/mockFinancialReports';

interface PerformerData {
  symbol: string;
  change_percent: number;
  timeframe: string;
  current_price: number;
  quantity: number;
  total_value: number;
  acquisition_cost: number;
  gain_loss_amount: number;
  asset_type: string;
}

interface HoldingsSummaryData {
  total_assets: number;
  total_market_value: number;
  total_cost_basis: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  total_annual_income: number;
  top_movers: PerformerData[];
  allocation_by_type: Record<string, number>;
}

// Toggle to use mock data for testing
const USE_MOCK_DATA = true;

// Generate mock holdings summary from mock assets
const generateMockHoldingsSummary = (timeframe: string = 'ytd'): HoldingsSummaryData => {
  const mockAssets = generateMockAssets('mixed-portfolio');
  
  const total_assets = mockAssets.length;
  const total_market_value = mockAssets.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
  const total_cost_basis = mockAssets.reduce((sum, asset) => sum + (asset.acquisition_cost || 0), 0);
  const total_unrealized_pl = total_market_value - total_cost_basis;
  const total_unrealized_pl_percent = total_cost_basis > 0 ? (total_unrealized_pl / total_cost_basis) * 100 : 0;
  const total_annual_income = mockAssets.reduce((sum, asset) => sum + (asset.annual_income || 0), 0);
  
  // Calculate allocation by type
  const allocation_by_type: Record<string, number> = {};
  mockAssets.forEach(asset => {
    const category = asset.category_name || 'other';
    allocation_by_type[category] = (allocation_by_type[category] || 0) + (asset.current_value || 0);
  });
  
  // Find top and worst performers based on performance
  const assetsWithPerformance = mockAssets
    .filter(asset => asset.metadata?.symbol && asset.acquisition_cost && asset.current_value)
    .map(asset => {
      const changePercent = ((asset.current_value! - asset.acquisition_cost!) / asset.acquisition_cost!) * 100;
      const quantity = asset.metadata?.asset_type === 'crypto' 
        ? asset.current_value! / (45000 + Math.random() * 20000) // Crypto typically has smaller quantities
        : Math.floor(asset.current_value! / (100 + Math.random() * 400)); // Stocks/ETFs in shares
      const currentPrice = asset.current_value! / quantity;
      const acquisitionCost = asset.acquisition_cost!;
      const gainLossAmount = asset.current_value! - acquisitionCost;
      
      return {
        symbol: asset.metadata.symbol,
        change_percent: changePercent,
        timeframe: timeframe,
        current_price: currentPrice,
        quantity: Math.round(quantity * 100) / 100,
        total_value: asset.current_value!,
        acquisition_cost: acquisitionCost,
        gain_loss_amount: gainLossAmount,
        asset_type: (asset.metadata?.asset_type || 'stock') as PerformerData['asset_type']
      };
    })
    .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
    .slice(0, 5);
  
  return {
    total_assets,
    total_market_value,
    total_cost_basis,
    total_unrealized_pl,
    total_unrealized_pl_percent,
    total_annual_income,
    top_movers: assetsWithPerformance,
    allocation_by_type
  };
};

export const useHoldingsSummary = (
  portfolioId?: string, 
  userId?: string,
  timeframe: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all' = 'ytd'
) => {
  // Add debug logging and fix UUID validation
  console.log('useHoldingsSummary called with:', { portfolioId, userId, timeframe });
  
  return useQuery({
    queryKey: [...INTELLIGENCE_KEYS.analysis(portfolioId || 'everything'), timeframe],
    queryFn: async (): Promise<HoldingsSummaryData> => {
      // Use mock data if flag is enabled
      if (USE_MOCK_DATA) {
        // Simulate network delay for realistic testing
        await new Promise(resolve => setTimeout(resolve, 500));
        return generateMockHoldingsSummary(timeframe);
      }

      try {
        // Convert "everything" to null for both parameters to prevent UUID errors
        const portfolioParam = (!portfolioId || portfolioId === 'everything') ? null : portfolioId;
        const userParam = (!userId || userId === 'everything') ? null : userId;
        
        console.log('Holdings summary RPC call with params:', { 
          portfolio_id_param: portfolioParam, 
          user_id_param: userParam 
        });
        
        const { data, error } = await supabase.rpc('get_holdings_summary', {
          portfolio_id_param: portfolioParam,
          user_id_param: userParam,
          timeframe_param: timeframe
        });

        if (error) {
          console.error('Error fetching holdings summary:', error);
          // Return fallback data instead of throwing to prevent dashboard crashes
          return {
            total_assets: 0,
            total_market_value: 0,
            total_cost_basis: 0,
            total_unrealized_pl: 0,
            total_unrealized_pl_percent: 0,
            total_annual_income: 0,
            top_movers: [],
            allocation_by_type: {}
          };
        }

        const result = data?.[0];
        if (!result) {
          return {
            total_assets: 0,
            total_market_value: 0,
            total_cost_basis: 0,
            total_unrealized_pl: 0,
            total_unrealized_pl_percent: 0,
            total_annual_income: 0,
            top_movers: [],
            allocation_by_type: {}
          };
        }

        return {
          total_assets: result.total_assets || 0,
          total_market_value: result.total_market_value || 0,
          total_cost_basis: result.total_cost_basis || 0,
          total_unrealized_pl: result.total_unrealized_pl || 0,
          total_unrealized_pl_percent: result.total_unrealized_pl_percent || 0,
          total_annual_income: result.total_annual_income || 0,
          top_movers: (result as any).top_movers as PerformerData[] || [],
          allocation_by_type: (result.allocation_by_type as Record<string, number>) || {}
        };
      } catch (error) {
        console.error('Holdings summary query failed:', error);
        // Return fallback data for any errors
        return {
          total_assets: 0,
          total_market_value: 0,
          total_cost_basis: 0,
          total_unrealized_pl: 0,
          total_unrealized_pl_percent: 0,
          total_annual_income: 0,
          top_movers: [],
          allocation_by_type: {}
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for better persistence
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    retry: (failureCount, error) => {
      // Don't retry on database schema errors
      if ((error as any)?.code === '42703') return false; // Column does not exist
      if ((error as any)?.code === '22P02') return false; // Invalid UUID syntax
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled: true, // Always enabled, handle user validation inside
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
};