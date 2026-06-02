import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LandlordPlacementFee {
  id: string;
  property_id: string;
  unit_id?: string;
  landlord_id: string;
  tenant_id?: string;
  fee_amount: number;
  first_month_rent?: number;
  security_deposit?: number;
  due_date: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'waived';
  payment_date?: string;
  payment_method?: string;
  stripe_payment_intent_id?: string;
  plaid_transaction_id?: string;
  admin_listed?: boolean;
  follow_up_status: 'none' | 'reminder_sent' | 'second_reminder' | 'final_notice' | 'collections';
  last_reminder_sent?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  waived_by?: string;
  waived_reason?: string;
  properties?: {
    address: string;
    admin_listed?: boolean;
  };
  property_units?: {
    unit_number: string;
    unit_name?: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useLandlordPlacementFees = (landlordId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get placement fees for a landlord
  const {
    data: placementFees,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landlord-placement-fees', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];
      
      const { data, error } = await supabase
        .from('landlord_placement_fees')
        .select(`
          *,
          properties!landlord_placement_fees_property_id_fkey(address, admin_listed),
          property_units!landlord_placement_fees_unit_id_fkey(unit_number, unit_name),
          profiles!landlord_placement_fees_landlord_id_fkey(first_name, last_name, email)
        `)
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LandlordPlacementFee[];
    },
    enabled: !!landlordId,
  });

  // Mark fee as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ feeId, paymentMethod, notes }: { feeId: string; paymentMethod?: string; notes?: string }) => {
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'manual',
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      toast({
        title: "Payment Recorded",
        description: "Placement fee has been marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  // Waive fee
  const waiveFeeMutation = useMutation({
    mutationFn: async ({ feeId, reason }: { feeId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          payment_status: 'waived',
          waived_by: user?.id,
          waived_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      toast({
        title: "Fee Waived",
        description: "Placement fee has been waived",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to waive fee",
        variant: "destructive",
      });
    },
  });

  // Update follow-up status
  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ feeId, status }: { feeId: string; status: string }) => {
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          follow_up_status: status,
          last_reminder_sent: status !== 'none' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      toast({
        title: "Follow-up Updated",
        description: "Follow-up status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow-up status",
        variant: "destructive",
      });
    },
  });

  return {
    placementFees,
    isLoading,
    error,
    markAsPaid: markAsPaidMutation,
    waiveFee: waiveFeeMutation,
    updateFollowUp: updateFollowUpMutation,
  };
};

// Hook for admin to get all placement fees
export const useAllPlacementFees = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: allPlacementFees,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['all-placement-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landlord_placement_fees')
        .select(`
          *,
          properties!landlord_placement_fees_property_id_fkey(address, admin_listed),
          property_units!landlord_placement_fees_unit_id_fkey(unit_number, unit_name),
          profiles!landlord_placement_fees_landlord_id_fkey(first_name, last_name, email, assigned_worker_id),
          tenant:profiles!landlord_placement_fees_tenant_id_fkey(first_name, last_name, email, assigned_worker_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fees = (data || []) as any[];

      // Resolve assigned worker names (prefer tenant's worker, fall back to landlord's)
      const workerIds = Array.from(new Set(
        fees.flatMap(f => [f.tenant?.assigned_worker_id, f.profiles?.assigned_worker_id]).filter(Boolean)
      ));

      let workerMap: Record<string, { first_name?: string; last_name?: string; email?: string }> = {};
      if (workerIds.length > 0) {
        const { data: workers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', workerIds);
        workerMap = Object.fromEntries((workers || []).map((w: any) => [w.id, w]));
      }

      const enriched = fees.map(f => {
        const workerId = f.tenant?.assigned_worker_id || f.profiles?.assigned_worker_id || null;
        const worker = workerId ? workerMap[workerId] : null;
        return {
          ...f,
          tenant_name: f.tenant
            ? `${f.tenant.first_name || ''} ${f.tenant.last_name || ''}`.trim() || null
            : null,
          tenant_email: f.tenant?.email || null,
          assigned_worker_name: worker
            ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || null
            : null,
          assigned_worker_email: worker?.email || null,
        };
      });

      return enriched as (LandlordPlacementFee & {
        tenant_name: string | null;
        tenant_email: string | null;
        assigned_worker_name: string | null;
        assigned_worker_email: string | null;
      })[];
    },
  });

  // Mark fee as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ feeId, paymentMethod, paymentDate, notes }: { feeId: string; paymentMethod?: string; paymentDate?: string; notes?: string }) => {
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          payment_status: 'paid',
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'manual',
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees-analytics'] });
      toast({
        title: "Payment Recorded",
        description: "Placement fee has been marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  // Waive fee
  const waiveFeeMutation = useMutation({
    mutationFn: async ({ feeId, reason }: { feeId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          payment_status: 'waived',
          waived_by: user?.id,
          waived_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees-analytics'] });
      toast({
        title: "Fee Waived",
        description: "Placement fee has been waived",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to waive fee",
        variant: "destructive",
      });
    },
  });

  // Update follow-up status
  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ feeId, followUpStatus }: { feeId: string; followUpStatus: LandlordPlacementFee['follow_up_status'] }) => {
      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          follow_up_status: followUpStatus,
          last_reminder_sent: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-placement-fees'] });
      toast({
        title: "Reminder Sent",
        description: "Follow-up reminder has been sent",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  return {
    allPlacementFees,
    isLoading,
    error,
    markAsPaid: markAsPaidMutation.mutateAsync,
    waiveFee: waiveFeeMutation.mutateAsync,
    updateFollowUp: updateFollowUpMutation.mutateAsync,
  };
};

// Hook for tracking new property acquisitions
export const useNewPropertyAcquisitions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: newAcquisitions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['new-property-acquisitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_owner_id_fkey(first_name, last_name, email, phone)
        `)
        .eq('recent_acquisition', true)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Update follow-up status for property acquisition
  const updateAcquisitionFollowUpMutation = useMutation({
    mutationFn: async ({ 
      propertyId, 
      status, 
      notes 
    }: { 
      propertyId: string; 
      status: string; 
      notes?: string 
    }) => {
      const { error } = await supabase
        .from('properties')
        .update({
          follow_up_status: status,
          outreach_notes: notes,
          last_outreach_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-property-acquisitions'] });
      toast({
        title: "Follow-up Updated",
        description: "Property acquisition follow-up status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow-up status",
        variant: "destructive",
      });
    },
  });

  return {
    newAcquisitions,
    isLoading,
    error,
    updateAcquisitionFollowUp: updateAcquisitionFollowUpMutation,
  };
};