import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  PortfolioAsset,
  AssetCategory,
  AssetRelationship,
  AssetValuation,
  PortfolioAssetSummary,
  CreateAssetParams,
  UpdateAssetParams,
  CreateAssetRelationshipParams,
  CreateAssetValuationParams,
} from '@/types/portfolio-assets';
import { PORTFOLIOS_KEYS } from '@/lib/queryKeys';

// Asset Categories
export const useAssetCategories = () => {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as AssetCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Portfolio Assets
export const usePortfolioAssets = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio-assets', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_assets')
        .select(`
          *,
          asset_category:asset_categories(*)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PortfolioAsset[];
    },
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Portfolio Asset Summary
export const usePortfolioAssetSummary = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio-asset-summary', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_asset_summary', {
        p_portfolio_id: portfolioId
      });

      if (error) throw error;
      
      // Transform the RPC response to match our type
      const result = data?.[0];
      if (!result) return null;
      
      return {
        total_assets: result.total_assets,
        total_value: result.total_value,
        total_annual_income: result.total_annual_income,
        total_annual_expenses: result.total_annual_expenses,
        net_annual_income: result.net_annual_income,
        asset_categories: Array.isArray(result.asset_categories) ? result.asset_categories as any[] : []
      } as PortfolioAssetSummary;
    },
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Single Asset
export const usePortfolioAsset = (assetId: string) => {
  return useQuery({
    queryKey: ['portfolio-asset', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_assets')
        .select(`
          *,
          asset_category:asset_categories(*)
        `)
        .eq('id', assetId)
        .single();

      if (error) throw error;
      return data as unknown as PortfolioAsset;
    },
    enabled: !!assetId,
  });
};

// Asset Relationships
export const useAssetRelationships = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-relationships', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_relationships')
        .select('*')
        .or(`parent_asset_id.eq.${assetId},child_asset_id.eq.${assetId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AssetRelationship[];
    },
    enabled: !!assetId,
  });
};

// Asset Valuations
export const useAssetValuations = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-valuations', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_valuations')
        .select('*')
        .eq('asset_id', assetId)
        .order('valuation_date', { ascending: false });

      if (error) throw error;
      return data as AssetValuation[];
    },
    enabled: !!assetId,
  });
};

// Mutations
export const usePortfolioAssetOperations = (portfolioId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createAsset = useMutation({
    mutationFn: async (params: CreateAssetParams) => {
      // Convert Date to string if needed
      const insertData = {
        ...params,
        acquisition_date: params.acquisition_date 
          ? (params.acquisition_date instanceof Date 
              ? params.acquisition_date.toISOString().split('T')[0] 
              : params.acquisition_date)
          : undefined
      };
      
      const { data, error } = await supabase
        .from('portfolio_assets')
        .insert([insertData])
        .select(`
          *,
          asset_category:asset_categories(*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PortfolioAsset;
    },
    onMutate: async (newAsset) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['portfolio-assets', portfolioId] });
      
      // Snapshot previous value
      const previousAssets = queryClient.getQueryData(['portfolio-assets', portfolioId]);
      
      // Optimistically update cache
      queryClient.setQueryData(['portfolio-assets', portfolioId], (old: PortfolioAsset[] | undefined) => {
        if (!old) return old;
        const optimisticAsset: PortfolioAsset = {
          id: 'temp-' + Date.now(),
          ...newAsset,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          asset_category: null // Will be populated on success
        } as PortfolioAsset;
        return [optimisticAsset, ...old];
      });
      
      return { previousAssets };
    },
    onError: (error: any, newAsset, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(['portfolio-assets', portfolioId], context.previousAssets);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create asset. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-assets', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_KEYS.all });
      toast({
        title: "Asset created",
        description: "The asset has been successfully added to your portfolio.",
      });
    },
  });

  const updateAsset = useMutation({
    mutationFn: async (params: UpdateAssetParams) => {
      const { id, ...updateData } = params;
      
      // Convert Date to string if needed
      const processedUpdateData = {
        ...updateData,
        acquisition_date: updateData.acquisition_date 
          ? (updateData.acquisition_date instanceof Date 
              ? updateData.acquisition_date.toISOString().split('T')[0] 
              : updateData.acquisition_date)
          : undefined
      };
      
      const { data, error } = await supabase
        .from('portfolio_assets')
        .update(processedUpdateData)
        .eq('id', id)
        .select(`
          *,
          asset_category:asset_categories(*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as PortfolioAsset;
    },
    onMutate: async (updatedAsset) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['portfolio-assets', portfolioId] });
      
      // Snapshot previous value
      const previousAssets = queryClient.getQueryData(['portfolio-assets', portfolioId]);
      
      // Optimistically update cache
      queryClient.setQueryData(['portfolio-assets', portfolioId], (old: PortfolioAsset[] | undefined) => {
        if (!old) return old;
        return old.map(asset => 
          asset.id === updatedAsset.id 
            ? { ...asset, ...updatedAsset, updated_at: new Date().toISOString() }
            : asset
        );
      });
      
      return { previousAssets };
    },
    onError: (error: any, updatedAsset, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(['portfolio-assets', portfolioId], context.previousAssets);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update asset. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-assets', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-asset', data.id] });
      toast({
        title: "Asset updated",
        description: "The asset has been successfully updated.",
      });
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('portfolio_assets')
        .update({ is_active: false })
        .eq('id', assetId);

      if (error) throw error;
    },
    onMutate: async (assetId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['portfolio-assets', portfolioId] });
      
      // Snapshot previous value
      const previousAssets = queryClient.getQueryData(['portfolio-assets', portfolioId]);
      
      // Optimistically remove from cache
      queryClient.setQueryData(['portfolio-assets', portfolioId], (old: PortfolioAsset[] | undefined) => {
        if (!old) return old;
        return old.filter(asset => asset.id !== assetId);
      });
      
      return { previousAssets };
    },
    onError: (error: any, assetId, context) => {
      // Rollback on error
      if (context?.previousAssets) {
        queryClient.setQueryData(['portfolio-assets', portfolioId], context.previousAssets);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-assets', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      toast({
        title: "Asset deleted",
        description: "The asset has been successfully removed from your portfolio.",
      });
    },
  });

  const createRelationship = useMutation({
    mutationFn: async (params: CreateAssetRelationshipParams) => {
      const { data, error } = await supabase
        .from('asset_relationships')
        .insert([params])
        .select('*')
        .single();

      if (error) throw error;
      return data as AssetRelationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-relationships'] });
      toast({
        title: "Relationship created",
        description: "The asset relationship has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create relationship. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createValuation = useMutation({
    mutationFn: async (params: CreateAssetValuationParams) => {
      const { data, error } = await supabase
        .from('asset_valuations')
        .insert([params])
        .select('*')
        .single();

      if (error) throw error;
      return data as AssetValuation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-valuations', data.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-assets', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-asset-summary', portfolioId] });
      toast({
        title: "Valuation recorded",
        description: "The asset valuation has been successfully recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record valuation. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createAsset,
    updateAsset,
    deleteAsset,
    createRelationship,
    createValuation,
  };
};