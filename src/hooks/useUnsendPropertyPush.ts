import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MATCHMAKER_KEYS } from '@/lib/queryKeys';

interface UnsendPushParams {
  pushId: string;
  tenantName?: string;
}

export const useUnsendPropertyPush = () => {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['push-status'] });
    queryClient.invalidateQueries({ queryKey: MATCHMAKER_KEYS.all });
  };

  const mutation = useMutation({
    mutationFn: async ({ pushId }: UnsendPushParams) => {
      // Hard delete the push record to unlock the property
      const { error } = await supabase
        .from('property_pushes')
        .delete()
        .eq('id', pushId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Push cancelled',
        description: variables.tenantName 
          ? `Push to ${variables.tenantName} has been cancelled. Property can now be pushed to another tenant.`
          : 'Push has been cancelled. Property can now be pushed to another tenant.',
      });
      // NOTE: Query invalidation moved to caller for timing control (Radix UI bug #3645)
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unsend push',
        variant: 'destructive',
      });
    },
  });

  return { ...mutation, invalidateQueries };
};
