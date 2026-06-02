import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PushToInProcessParams {
  unitId: string;
  reason?: string;
}

interface RejectFromInProcessParams {
  unitId: string;
  reason?: string;
}

export const useAdminInProcessActions = () => {
  const queryClient = useQueryClient();

  const pushToInProcess = useMutation({
    mutationFn: async ({ unitId, reason }: PushToInProcessParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('admin_push_to_in_process', {
        p_unit_id: unitId,
        p_admin_id: user.id,
        p_reason: reason || 'Admin override',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['property-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      
      toast({
        title: 'Moved to In Process',
        description: 'Unit has been moved to In Process stage. Listing is now paused.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Move to In Process',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const rejectFromInProcess = useMutation({
    mutationFn: async ({ unitId, reason }: RejectFromInProcessParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('admin_reject_from_in_process', {
        p_unit_id: unitId,
        p_admin_id: user.id,
        p_reason: reason || 'Returned to previous stage',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['property-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      
      toast({
        title: 'Returned from In Process',
        description: 'Unit has been returned to previous stage. Listing is now active.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Return from In Process',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    pushToInProcess,
    rejectFromInProcess,
  };
};
