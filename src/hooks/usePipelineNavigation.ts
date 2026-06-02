import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MATCHMAKER_KEYS } from '@/lib/queryKeys';

interface MoveForwardParams {
  entityId: string;
  entityType: 'tenant' | 'property';
  currentStage: string;
  workerId?: string;
  notes?: string;
}

interface JumpToFinalParams {
  entityId: string;
  entityType: 'tenant' | 'property';
  notes?: string;
}

export const usePipelineNavigation = () => {
  const queryClient = useQueryClient();

  const moveForwardOneStage = useMutation({
    mutationFn: async ({ entityId, entityType, currentStage, workerId, notes }: MoveForwardParams) => {
      if (entityType === 'tenant') {
        // Tenant forward progression
        if (currentStage === 'unassigned' || !currentStage) {
          // Assign to worker (current user if workerId provided)
          const { error } = await supabase
            .from('profiles')
            .update({
              assigned_worker_id: workerId,
              pipeline_stage: 'assigned',
            })
            .eq('id', entityId);

          if (error) throw error;
      } else if (currentStage === 'assigned') {
        // Tenant moves directly to lease_signed when lease is signed
        const { error } = await supabase
          .from('profiles')
          .update({
            housing_status: 'approved',
            pipeline_stage: 'lease_signed',
          })
          .eq('id', entityId);

        if (error) throw error;
      } else if (currentStage === 'lease_signed' || currentStage === 'approved_awaiting' || currentStage === 'approved') {
          // Mark as paid (housed & paid)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              housing_status: 'housed',
              pipeline_stage: 'housed_paid',
            })
            .eq('id', entityId);

          if (updateError) throw updateError;

          // Update application as priority payment made
          const { error: appError } = await supabase
            .from('unit_applications')
            .update({
              priority_payment_made: true,
              notes: notes || null,
            })
            .eq('tenant_id', entityId)
            .eq('status', 'approved');

          if (appError) throw appError;
        }
      } else {
        // Property forward progression
        if (currentStage === 'unassigned' || !currentStage) {
          // Assign to worker
          const { error } = await supabase
            .from('property_units')
            .update({
              assigned_worker_id: workerId,
              pipeline_stage: 'available',
            })
            .eq('id', entityId);

          if (error) throw error;
      } else if (currentStage === 'available') {
        // Property requires tenant selection to move to in_process
        throw new Error('Tenant selection required');
      } else if (currentStage === 'in_process') {
        // From in_process → filled_awaiting_payment (lease signed)
        throw new Error('Lease signing transition to be defined');
      } else if (currentStage === 'filled_awaiting_payment') {
          // Mark as paid
          const { error } = await supabase
            .from('property_units')
            .update({
              pipeline_stage: 'paid_housed',
            })
            .eq('id', entityId);

          if (error) throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Successfully moved ${variables.entityType} forward`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: MATCHMAKER_KEYS.workerPipeline(variables.entityType, variables.workerId || '') });
      queryClient.invalidateQueries({ queryKey: ['enhanced-unassigned-queue'] });
    },
    onError: (error: Error) => {
      if (error.message === 'Unit selection required' || error.message === 'Tenant selection required') {
        // Don't show error toast - this is expected and dialog will open
        return;
      }
      console.error('Error moving forward:', error);
      toast.error('Failed to move forward. Please try again.');
    },
  });

  const jumpToFinal = useMutation({
    mutationFn: async ({ entityId, entityType, notes }: JumpToFinalParams) => {
      if (entityType === 'tenant') {
        // Jump to housed & paid
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            housing_status: 'housed',
            pipeline_stage: 'housed_paid',
          })
          .eq('id', entityId);

        if (updateError) throw updateError;

        // Try to update existing application or note that it needs to be created
        const { error: appError } = await supabase
          .from('unit_applications')
          .update({
            priority_payment_made: true,
            notes: notes || null,
          })
          .eq('tenant_id', entityId)
          .eq('status', 'approved');

        // If no application exists, this is expected for early stages
        if (appError && !appError.message.includes('0 rows')) {
          throw appError;
        }
      } else {
        // Jump to paid
        const { error } = await supabase
          .from('property_units')
          .update({
            pipeline_stage: 'paid_housed',
          })
          .eq('id', entityId);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Successfully jumped ${variables.entityType} to final stage`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-unassigned-queue'] });
    },
    onError: (error: Error) => {
      console.error('Error jumping to final:', error);
      toast.error('Failed to jump to final stage. Please try again.');
    },
  });

  return {
    moveForwardOneStage,
    jumpToFinal,
  };
};
