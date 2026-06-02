import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeAssets = (portfolioId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!portfolioId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_assets'
        },
        (payload: any) => {
          const affectedPortfolioId = payload.new?.portfolio_id || payload.old?.portfolio_id;
          
          if (affectedPortfolioId) {
            // Invalidate asset queries for the affected portfolio
            queryClient.invalidateQueries({ queryKey: ['portfolio-assets', affectedPortfolioId] });
            queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary', affectedPortfolioId] });
            queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
            
            // Also invalidate specific asset if we have the ID
            const assetId = payload.new?.id || payload.old?.id;
            if (assetId) {
              queryClient.invalidateQueries({ queryKey: ['portfolio-asset', assetId] });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_relationships'
        },
        (payload: any) => {
          const parentAssetId = payload.new?.parent_asset_id || payload.old?.parent_asset_id;
          const childAssetId = payload.new?.child_asset_id || payload.old?.child_asset_id;
          
          if (parentAssetId) {
            queryClient.invalidateQueries({ queryKey: ['asset-relationships', parentAssetId] });
          }
          if (childAssetId) {
            queryClient.invalidateQueries({ queryKey: ['asset-relationships', childAssetId] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_valuations'
        },
        (payload: any) => {
          const assetId = payload.new?.asset_id || payload.old?.asset_id;
          
          if (assetId) {
            queryClient.invalidateQueries({ queryKey: ['asset-valuations', assetId] });
            // Also refresh the portfolio summary as valuations affect total values
            queryClient.invalidateQueries({ queryKey: ['portfolio-assets'] });
            queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [portfolioId, queryClient]);
};