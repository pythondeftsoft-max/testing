import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CancelLeaseParams {
  propertyPushId: string;
}

interface CancelLeaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const useCancelLease = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyPushId }: CancelLeaseParams): Promise<CancelLeaseResponse> => {
      const { data, error } = await supabase.rpc('landlord_cancel_lease', {
        p_property_push_id: propertyPushId,
      });

      if (error) throw error;
      
      const result = data as unknown as CancelLeaseResponse;
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel lease');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property_pushes'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      toast({
        title: 'Lease Canceled',
        description: 'The lease has been canceled. You can now send a new lease.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
};
