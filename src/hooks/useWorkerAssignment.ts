import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignTenantParams {
  tenantId: string;
  workerId: string;
}


export const useWorkerAssignment = () => {
  const queryClient = useQueryClient();

  const assignTenantToWorker = useMutation({
    mutationFn: async ({ tenantId, workerId }: AssignTenantParams) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          assigned_worker_id: workerId,
          worker_assigned_at: new Date().toISOString(),
          housing_status: 'seeking',
          pipeline_stage: 'assigned'
        })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['enhanced-unassigned-queue', 'tenant'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2', 'tenant'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
      ]);
      toast.success('Tenant assigned successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to assign tenant: ${error.message}`);
    },
  });


  const unassignTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          assigned_worker_id: null,
          worker_assigned_at: null,
          pipeline_stage: null
        })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['enhanced-unassigned-queue', 'tenant'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2', 'tenant'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
      ]);
      toast.success('Tenant sent back to queue');
    },
    onError: (error: any) => {
      toast.error(`Failed to unassign tenant: ${error.message}`);
    },
  });

  return {
    assignTenantToWorker,
    unassignTenant,
  };
};
