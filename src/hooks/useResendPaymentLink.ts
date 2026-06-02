import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useResendPaymentLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      console.log('[ResendPaymentLink] Calling process-lease-signed-payment for:', applicationId);
      
      const { data, error } = await supabase.functions.invoke(
        'process-lease-signed-payment',
        {
          body: { applicationId, forceNew: true },
        }
      );

      if (error) {
        console.error('[ResendPaymentLink] Error:', error);
        throw error;
      }
      
      console.log('[ResendPaymentLink] Success:', data);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      if (data?.emailSent) {
        toast.success('Payment link sent to landlord (in-app + email)');
      } else if (data?.emailError) {
        toast.warning(`Payment link sent in-app, but email failed: ${data.emailError}`);
      } else {
        toast.success('Payment link sent to landlord');
      }
    },
    onError: (error: Error) => {
      console.error('[ResendPaymentLink] Error:', error);
      toast.error(error.message || 'Failed to send payment link');
    },
  });
};
