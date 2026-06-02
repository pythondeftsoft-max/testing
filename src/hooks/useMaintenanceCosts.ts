
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface MaintenanceCost {
  id: string;
  maintenance_request_id: string;
  appointment_id?: string;
  vendor_id?: string;
  cost_type: 'labor' | 'materials' | 'equipment' | 'permits' | 'other';
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  receipt_url?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  submitted_by?: string;
}

export interface CreateCostParams {
  maintenance_request_id: string;
  appointment_id?: string;
  vendor_id?: string;
  cost_type: MaintenanceCost['cost_type'];
  description: string;
  quantity: number;
  unit_cost: number;
  receipt_url?: string;
}

export interface UpdateCostParams extends Partial<CreateCostParams> {
  id: string;
}

export const useMaintenanceCosts = (requestId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const costsQuery = useQuery({
    queryKey: ['maintenance-costs', requestId],
    queryFn: async () => {
      console.log('Fetching maintenance costs for request:', requestId);
      
      let query = supabase
        .from('maintenance_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestId) {
        query = query.eq('maintenance_request_id', requestId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance costs:', error);
        throw error;
      }

      console.log('Fetched maintenance costs:', data);
      return data as MaintenanceCost[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-costs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_costs'
        },
        (payload) => {
          console.log('Real-time maintenance cost change:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-costs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createCost = useMutation({
    mutationFn: async (params: CreateCostParams) => {
      // Calculate total cost
      const total_cost = params.quantity * params.unit_cost;
      
      const { data, error } = await supabase
        .from('maintenance_costs')
        .insert({
          ...params,
          total_cost
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs'] });
      toast({
        title: "Cost Added",
        description: "Maintenance cost has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating cost:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add maintenance cost",
        variant: "destructive",
      });
    },
  });

  const updateCost = useMutation({
    mutationFn: async (params: UpdateCostParams) => {
      const { id, ...updateData } = params;
      
      // Calculate total cost if quantity or unit_cost changed
      if (updateData.quantity !== undefined || updateData.unit_cost !== undefined) {
        const existingCost = costsQuery.data?.find(cost => cost.id === id);
        if (existingCost) {
          const quantity = updateData.quantity ?? existingCost.quantity;
          const unit_cost = updateData.unit_cost ?? existingCost.unit_cost;
          (updateData as any).total_cost = quantity * unit_cost;
        }
      }
      
      const { data, error } = await supabase
        .from('maintenance_costs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs'] });
      toast({
        title: "Cost Updated",
        description: "Maintenance cost has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating cost:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance cost",
        variant: "destructive",
      });
    },
  });

  const deleteCost = useMutation({
    mutationFn: async (costId: string) => {
      const { error } = await supabase
        .from('maintenance_costs')
        .delete()
        .eq('id', costId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs'] });
      toast({
        title: "Cost Deleted",
        description: "Maintenance cost has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting cost:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete maintenance cost",
        variant: "destructive",
      });
    },
  });

  const approveCost = useMutation({
    mutationFn: async (costId: string) => {
      const { data, error } = await supabase
        .from('maintenance_costs')
        .update({ 
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', costId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-costs'] });
      toast({
        title: "Cost Approved",
        description: "Maintenance cost has been approved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error approving cost:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve maintenance cost",
        variant: "destructive",
      });
    },
  });

  const totalCosts = costsQuery.data?.reduce((sum, cost) => sum + cost.total_cost, 0) || 0;

  return {
    costs: costsQuery.data || [],
    isLoading: costsQuery.isLoading,
    error: costsQuery.error,
    totalCosts,
    createCost,
    updateCost,
    deleteCost,
    approveCost,
  };
};
