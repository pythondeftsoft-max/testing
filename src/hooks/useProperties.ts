import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizePortfolioId } from '@/utils/portfolio';
import { PROPERTIES_KEYS } from '@/lib/queryKeys';

export interface Property {
  id: string;
  owner_id: string;
  portfolio_id?: string;
  status: string;
  tenant_request_count: number;
  // ... other property fields
}

// Query keys
export const propertyKeys = {
  all: ['properties'] as const,
  byOwner: (ownerId: string) => [...propertyKeys.all, 'owner', ownerId] as const,
  byPortfolio: (portfolioId: string) => [...propertyKeys.all, 'portfolio', portfolioId] as const,
  byId: (id: string) => [...propertyKeys.all, id] as const,
};

// Hook to fetch properties with real-time updates
export function useProperties(userId: string, rawPortfolioId?: string) {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = portfolioId 
    ? PROPERTIES_KEYS.list(`userId:${userId}-portfolio:${portfolioId}`)
    : PROPERTIES_KEYS.list(`userId:${userId}-portfolio:all`);

  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (userId) {
      console.log('🔍 [PROPERTIES] Portfolio changed, invalidating cache:', { userId, portfolioId });
      queryClient.invalidateQueries({ 
        queryKey: PROPERTIES_KEYS.all,
        exact: false 
      });
    }
  }, [userId, portfolioId, queryClient]);

  const { data: properties = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('*')
        .is('deleted_at', null);

      if (portfolioId) {
        // For specific portfolio (already normalized)
        query = query.eq('portfolio_id', portfolioId);
      } else {
        // Show all user properties
        query = query.eq('owner_id', userId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching properties:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for properties
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time property update:', payload);
          
          // Invalidate and refetch properties
          queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(userId) });
          
          if (portfolioId && portfolioId !== 'everything') {
            queryClient.invalidateQueries({ queryKey: propertyKeys.byPortfolio(portfolioId) });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_tenant_requests'
        },
        (payload) => {
          console.log('Real-time tenant request update:', payload);
          
          // Invalidate properties when tenant requests change
          queryClient.invalidateQueries({ queryKey: propertyKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, portfolioId, queryClient]);

  return {
    properties,
    isLoading,
    error,
    refetch,
  };
}

// Hook for property status updates
export function usePropertyStatusUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      propertyId, 
      status, 
      updates 
    }: { 
      propertyId: string; 
      status: string; 
      updates?: Record<string, any> 
    }) => {
      const { data, error } = await supabase
        .from('properties')
        .update({ status, ...updates })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        propertyKeys.byId(data.id),
        data
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(data.owner_id) });
      
      if (data.portfolio_id) {
        queryClient.invalidateQueries({ queryKey: propertyKeys.byPortfolio(data.portfolio_id) });
      }

      toast({
        title: "Property Updated",
        description: "Property status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating property:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update property status. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook for tenant request operations
export function useTenantRequestUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      action, 
      propertyId, 
      unitId 
    }: { 
      action: 'activate' | 'deactivate'; 
      propertyId: string; 
      unitId?: string 
    }) => {
      if (action === 'deactivate') {
        // Deactivate all tenant requests for this property
        const { error: requestError } = await supabase
          .from('property_tenant_requests')
          .update({ status: 'inactive' })
          .eq('property_id', propertyId);

        if (requestError) throw requestError;

        // Update property status to vacant and clear desired_rent
        const { data, error: propertyError } = await supabase
          .from('properties')
          .update({ 
            status: 'vacant',
            desired_rent: null 
          })
          .eq('id', propertyId)
          .select()
          .single();

        if (propertyError) throw propertyError;
        return data;
      }
      
      // For activate, this would be handled by the tenant request form
      return null;
    },
    onSuccess: (data) => {
      if (data) {
        // Invalidate all property queries
        queryClient.invalidateQueries({ queryKey: propertyKeys.all });
        
        toast({
          title: "Success",
          description: "Property has been taken off market successfully.",
        });
      }
    },
    onError: (error) => {
      console.error('Error updating tenant request:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update property. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Re-export the realtime hook
export { useRealtimeProperties } from './useRealtimeProperties';
