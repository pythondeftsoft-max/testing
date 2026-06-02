import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
type MaintenanceRequestInsert = Database['public']['Tables']['maintenance_requests']['Insert'];
type MaintenanceRequestUpdate = Database['public']['Tables']['maintenance_requests']['Update'];

export interface CreateUnitMaintenanceRequestParams {
  property_id: string;
  unit_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  preferred_date?: string;
  emergency_contact?: string;
  photos?: string[];
}

export interface UpdateUnitMaintenanceRequestParams extends Partial<CreateUnitMaintenanceRequestParams> {
  id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export const useUnitMaintenanceRequests = (unitId: string, propertyId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active tenant for this unit to use as default requester
  const tenantQuery = useQuery({
    queryKey: ['unit-tenant', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_applications')
        .select(`
          tenant_id,
          profiles!unit_applications_tenant_id_fkey(first_name, last_name)
        `)
        .eq('unit_id', unitId)
        .eq('status', 'approved')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching unit tenant:', error);
        throw error;
      }

      return data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ['unit-maintenance-requests', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner(address, portfolio_id, owner_id),
          profiles!maintenance_requests_tenant_id_fkey(first_name, last_name)
        `)
        .eq('unit_id', unitId)
        .order('submitted_date', { ascending: false });

      if (error) {
        console.error('Error fetching unit maintenance requests:', error);
        throw error;
      }

      return data as MaintenanceRequest[];
    },
  });

  // Real-time subscription for unit-specific maintenance requests
  useEffect(() => {
    const channel = supabase
      .channel(`unit-maintenance-${unitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
          filter: `unit_id=eq.${unitId}`
        },
        (payload) => {
          console.log('Real-time unit maintenance request change:', payload);
          // Invalidate both unit-scoped and global queries
          queryClient.invalidateQueries({ queryKey: ['unit-maintenance-requests', unitId] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, unitId]);

  const createRequest = useMutation({
    mutationFn: async (params: CreateUnitMaintenanceRequestParams) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-maintenance-requests', unitId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
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
    mutationFn: async (params: UpdateUnitMaintenanceRequestParams) => {
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
      queryClient.invalidateQueries({ queryKey: ['unit-maintenance-requests', unitId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
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
      queryClient.invalidateQueries({ queryKey: ['unit-maintenance-requests', unitId] });
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
    tenant: tenantQuery.data,
    createRequest,
    updateRequest,
    deleteRequest,
  };
};

export type { MaintenanceRequest };