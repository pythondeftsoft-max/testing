import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TenantStage = 'unassigned' | 'assigned' | 'approved_awaiting' | 'housed_paid';
export type PropertyStage = 'unassigned' | 'available' | 'filled_awaiting_payment' | 'paid';

export const useTenantPipelineNavigation = () => {
  const queryClient = useQueryClient();

  const moveBackOneStage = useMutation({
    mutationFn: async ({ 
      tenantId, 
      currentStage 
    }: { 
      tenantId: string; 
      currentStage: TenantStage 
    }) => {
      switch (currentStage) {
        case 'assigned':
          // From assigned → unassigned: Remove assigned_worker_id
          const { error: assignedError } = await supabase
            .from('profiles')
            .update({ 
              pipeline_stage: null,
              assigned_worker_id: null,
              worker_assigned_at: null,
              housing_status: 'seeking',
            })
            .eq('id', tenantId);
          
          if (assignedError) throw assignedError;
          return 'unassigned';

        case 'approved_awaiting':
          // From approved_awaiting → assigned: Update housing_status, unmatch from unit
          
          // STEP 1: Find any unit that has this tenant assigned
          const { data: assignedUnit } = await supabase
            .from('property_units')
            .select('id')
            .eq('tenant_id', tenantId)
            .maybeSingle();
          
          // STEP 2: Update tenant housing status and pipeline_stage
          const { error: approvedError } = await supabase
            .from('profiles')
            .update({ 
              housing_status: 'seeking',
              pipeline_stage: 'assigned'
            })
            .eq('id', tenantId);
          
          if (approvedError) throw approvedError;

          // STEP 3: If there was a matched unit, clean it up and return to available
          if (assignedUnit?.id) {
            const { error: unitError } = await supabase
              .from('property_units')
              .update({ 
                pipeline_stage: 'available',
                on_market: true,
                tenant_id: null,
                lease_signed_date: null,
                lease_start_date: null,
                lease_end_date: null,
                monthly_rent: null,
                status: 'vacant'
              })
              .eq('id', assignedUnit.id);
            
            if (unitError) throw unitError;
          }

          // STEP 4: Delete any unit_applications for this tenant
          const { error: deleteError } = await supabase
            .from('unit_applications')
            .delete()
            .eq('tenant_id', tenantId);
          
          if (deleteError) throw deleteError;
          
          return 'assigned';

        case 'housed_paid':
          // From housed_paid → approved_awaiting: Set priority_payment_made = false
          const { error: paidError } = await supabase
            .from('unit_applications')
            .update({ priority_payment_made: false })
            .eq('tenant_id', tenantId)
            .eq('status', 'approved');
          
          if (paidError) throw paidError;
          
          // Update tenant pipeline_stage to trigger activity logging
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ pipeline_stage: 'approved_awaiting' })
            .eq('id', tenantId);
          
          if (profileError) throw profileError;
          
          return 'approved_awaiting';

        default:
          throw new Error('Cannot move back from unassigned stage');
      }
    },
    onSuccess: async (previousStage) => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['enhanced-unassigned-queue'] }),
      ]);
      
      const stageLabels: Record<string, string> = {
        unassigned: 'Unassigned Queue',
        assigned: 'Assigned',
        approved_awaiting: 'Approved & Awaiting Payment',
      };
      
      toast.success(`Tenant moved back to ${stageLabels[previousStage]}`);
    },
    onError: (error: any) => {
      console.error('Move back one stage error:', error);
      toast.error(error.message || 'Failed to move tenant back');
    },
  });

  const backToQueue = useMutation({
    mutationFn: async (tenantId: string) => {
      // Complete reset to unassigned
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          assigned_worker_id: null,
          worker_assigned_at: null,
          housing_status: 'seeking',
          pipeline_stage: null,
        })
        .eq('id', tenantId);
      
      if (updateError) throw updateError;

      // Delete any unit applications
      const { error: deleteError } = await supabase
        .from('unit_applications')
        .delete()
        .eq('tenant_id', tenantId);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['enhanced-unassigned-queue'] }),
      ]);
      toast.success('Tenant sent back to queue');
    },
    onError: (error: any) => {
      console.error('Back to queue error:', error);
      toast.error(error.message || 'Failed to send tenant back to queue');
    },
  });

  return {
    moveBackOneStage,
    backToQueue,
  };
};

export const usePropertyPipelineNavigation = () => {
  const queryClient = useQueryClient();

  const moveBackOneStage = useMutation({
    mutationFn: async ({ 
      unitId, 
      currentStage 
    }: { 
      unitId: string; 
      currentStage: PropertyStage 
    }) => {
      switch (currentStage) {
        case 'available':
          // From available → unassigned: Remove assigned_worker_id
          const { error: availableError } = await supabase
            .from('property_units')
            .update({ 
              assigned_worker_id: null,
              pipeline_stage: null,
            })
            .eq('id', unitId);
          
          if (availableError) throw availableError;
          return 'unassigned';

        case 'filled_awaiting_payment':
          // Get the current tenant_id and assigned_worker_id before we clear it
          const { data: unitData } = await supabase
            .from('property_units')
            .select('tenant_id, assigned_worker_id')
            .eq('id', unitId)
            .single();

          if (!unitData) throw new Error('Unit not found');

          const tenantId = unitData.tenant_id;

          // Update property unit back to 'available' stage
          // Clear tenant match, lease details, but KEEP assigned_worker_id
          const { error: unitUpdateError } = await supabase
            .from('property_units')
            .update({
              tenant_id: null,
              pipeline_stage: 'available',
              lease_signed_date: null,
              lease_start_date: null,
              lease_end_date: null,
              monthly_rent: null,
              status: 'vacant',
              on_market: false  // Keep it OFF market (assigned to worker)
            })
            .eq('id', unitId);

          if (unitUpdateError) throw unitUpdateError;

          // If there's a tenant, move them back to 'assigned' stage
          if (tenantId) {
            const { error: tenantUpdateError } = await supabase
              .from('profiles')
              .update({
                pipeline_stage: 'assigned',
                housing_status: 'seeking'
              })
              .eq('id', tenantId);

            if (tenantUpdateError) throw tenantUpdateError;
          }

          // Delete unit applications
          const { error: appDeleteError } = await supabase
            .from('unit_applications')
            .delete()
            .eq('unit_id', unitId);

          if (appDeleteError) throw appDeleteError;

          return 'available';

        case 'paid':
          // From paid → filled_awaiting_payment: Set priority_payment_made = false
          const { error: paidError } = await supabase
            .from('unit_applications')
            .update({ priority_payment_made: false })
            .eq('unit_id', unitId)
            .eq('status', 'approved');
          
          if (paidError) throw paidError;
          return 'filled_awaiting_payment';

        default:
          throw new Error('Cannot move back from unassigned stage');
      }
    },
    onSuccess: (previousStage) => {
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-unassigned-queue'] });
      
      const stageLabels: Record<string, string> = {
        unassigned: 'Unassigned Queue',
        available: 'Available',
        filled_awaiting_payment: 'Filled & Awaiting Payment',
      };
      
      toast.success(`Property moved back to ${stageLabels[previousStage]}`);
    },
    onError: (error: any) => {
      console.error('Move back one stage error:', error);
      toast.error(error.message || 'Failed to move property back');
    },
  });

  const backToQueue = useMutation({
    mutationFn: async (unitId: string) => {
      // Complete reset to unassigned
      const { error: updateError } = await supabase
        .from('property_units')
        .update({ 
          assigned_worker_id: null,
          pipeline_stage: null,
        })
        .eq('id', unitId);
      
      if (updateError) throw updateError;

      // Delete any unit applications
      const { error: deleteError } = await supabase
        .from('unit_applications')
        .delete()
        .eq('unit_id', unitId);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-unassigned-queue'] });
      
      toast.success('Property sent back to queue');
    },
    onError: (error: any) => {
      console.error('Back to queue error:', error);
      toast.error(error.message || 'Failed to send property back to queue');
    },
  });

  return {
    moveBackOneStage,
    backToQueue,
  };
};
