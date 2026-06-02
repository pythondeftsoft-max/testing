import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioHealthInsightEngine } from '@/utils/PortfolioHealthInsightEngine';

export interface PortfolioHealthInsight {
  id: string;
  title: string;
  description: string;
  impact: number;
  healthScoreImpact: number;
  confidence: number;
  category: 'opportunity' | 'risk';
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  healthCategory: 'occupancy' | 'financial' | 'maintenance' | 'tenant_relations' | 'diversification' | 'market_timing' | 'tax_optimization';
  dataSource: string;
  actionable: boolean;
  assetType?: 'property' | 'stock' | 'crypto' | 'bond' | 'vehicle' | 'business' | 'alternative' | 'mixed';
  geographicArea?: string;
}

export const usePortfolioHealthInsightGenerator = (userId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['portfolio-health-insights', userId, portfolioId],
    queryFn: async () => {
      // Fetch properties data
      let propertiesQuery = supabase
        .from('properties')
        .select(`
          *,
          maintenance_requests(
            id, category, status, estimated_cost, actual_cost, created_at, priority, description
          )
        `)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (portfolioId && portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      // Fetch portfolio assets - include assets from all portfolios or specific portfolio
      let assets = [];
      let assetsQuery = supabase
        .from('portfolio_assets')
        .select(`
          *,
          asset_category:asset_categories(*),
          asset_market_data(*),
          asset_recurring_charges(*),
          portfolio_id
        `)
        .eq('is_active', true);

      if (portfolioId && portfolioId !== 'everything') {
        assetsQuery = assetsQuery.eq('portfolio_id', portfolioId);
      } else if (userId) {
        // For 'everything' view, get assets from all portfolios user has access to
        const { data: userPortfolios } = await supabase
          .from('portfolio_roles')
          .select('portfolio_id')
          .eq('user_id', userId)
          .eq('is_active', true);
        
        if (userPortfolios && userPortfolios.length > 0) {
          const portfolioIds = userPortfolios.map(pr => pr.portfolio_id);
          assetsQuery = assetsQuery.in('portfolio_id', portfolioIds);
        }
      }

      const { data: portfolioAssets, error: assetsError } = await assetsQuery;
      if (assetsError) throw assetsError;
      assets = portfolioAssets || [];

      // Fetch rent payments for financial analysis
      const { data: rentPayments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select(`
          *,
          properties!inner(owner_id, portfolio_id)
        `)
        .eq('properties.owner_id', userId);

      if (paymentsError) throw paymentsError;

      // Generate insights using the analysis engine
      const analysisEngine = new PortfolioHealthInsightEngine();
      const insights = analysisEngine.generateInsights({
        properties: properties || [],
        assets: assets || [],
        rentPayments: rentPayments || [],
        portfolioId
      });

      return insights;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};