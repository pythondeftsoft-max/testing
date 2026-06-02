
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { normalizePortfolioId } from '@/utils/portfolio';
import type { Database } from '@/integrations/supabase/types';

type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
type MaintenanceRequestInsert = Database['public']['Tables']['maintenance_requests']['Insert'];
type MaintenanceRequestUpdate = Database['public']['Tables']['maintenance_requests']['Update'];

export interface CreateMaintenanceRequestParams {
  property_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  preferred_date?: string;
  emergency_contact?: string;
  photos?: string[];
}

export interface UpdateMaintenanceRequestParams extends Partial<CreateMaintenanceRequestParams> {
  id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export const useMaintenanceRequests = (rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    console.log('🔍 [MAINTENANCE_REQUESTS] Portfolio changed, invalidating cache:', { portfolioId });
    queryClient.invalidateQueries({ 
      queryKey: ['maintenance-requests'],
      exact: false 
    });
  }, [portfolioId, queryClient]);

  const requestsQuery = useQuery({
    queryKey: ['maintenance-requests', portfolioId],
    queryFn: async () => {
      console.log('Fetching maintenance requests for portfolio:', portfolioId);
      
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner(address, portfolio_id, owner_id),
          profiles!maintenance_requests_tenant_id_fkey(first_name, last_name),
          property_units(id, unit_number, unit_name),
          vendor_payment_records(payment_method, amount)
        `)
        .order('submitted_date', { ascending: false });

      if (portfolioId) {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance requests:', error);
        throw error;
      }

      console.log('Fetched maintenance requests:', data);
      return data as MaintenanceRequest[];
    },
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        (payload) => {
          console.log('Real-time maintenance request change:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createRequest = useMutation({
    mutationFn: async (params: CreateMaintenanceRequestParams) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      toast({
        title: "Request Created",
        description: "Maintenance request has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create maintenance request",
        variant: "destructive",
      });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async (params: UpdateMaintenanceRequestParams) => {
      const { id, ...updateData } = params;
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      toast({
        title: "Request Updated",
        description: "Maintenance request has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance request",
        variant: "destructive",
      });
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast({
        title: "Request Deleted",
        description: "Maintenance request has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete maintenance request",
        variant: "destructive",
      });
    },
  });

  return {
    requests: requestsQuery.data || [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    createRequest,
    updateRequest,
    deleteRequest,
  };
};

export type { MaintenanceRequest };
