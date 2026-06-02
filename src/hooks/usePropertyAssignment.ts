import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignPropertyUnitParams {
  unitId: string;
  workerId: string;
}

export const usePropertyAssignment = () => {
  const queryClient = useQueryClient();

  const assignPropertyUnitToWorker = useMutation({
    mutationFn: async ({ unitId, workerId }: AssignPropertyUnitParams) => {
      const { data, error } = await supabase
        .from('property_units')
        .update({ 
          assigned_worker_id: workerId,
          pipeline_stage: 'available'
        })
        .eq('id', unitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['unassigned-property-units'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2', 'property'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
      ]);
      
      toast.success('Property assigned to your workload');
    },
    onError: (error: any) => {
      console.error('Error assigning property:', error);
      toast.error('Failed to assign property. Please try again.');
    },
  });

  const unassignPropertyUnit = useMutation({
    mutationFn: async (unitId: string) => {
      const { data, error } = await supabase
        .from('property_units')
        .update({ 
          assigned_worker_id: null,
          pipeline_stage: null
        })
        .eq('id', unitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['unassigned-property-units'] }),
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2', 'property'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
      ]);
      
      toast.success('Property sent back to queue');
    },
    onError: (error: any) => {
      console.error('Error unassigning property:', error);
      toast.error('Failed to unassign property. Please try again.');
    },
  });

  return {
    assignPropertyUnitToWorker,
    unassignPropertyUnit,
  };
};
