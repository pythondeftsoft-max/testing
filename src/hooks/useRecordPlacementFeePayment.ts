import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecordPlacementFeePaymentParams {
  applicationId?: string; // Optional for property-based payments
  unitId: string;
  tenantId: string;
  propertyId: string;
  feeAmount: number;
  paymentDate: string;
  paymentMethod: 'stripe' | 'plaid' | 'wire' | 'other';
  bankAccountId?: string;
  plaidTransactionId?: string;
  transactionReference?: string;
  transactionAmount?: number;
  bankName?: string;
  notes?: string;
}

export const useRecordPlacementFeePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordPlacementFeePaymentParams) => {
      const { data, error } = await supabase.functions.invoke('record-placement-fee-payment', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.refetchQueries({ queryKey: ['worker-pipeline'] });
      queryClient.refetchQueries({ queryKey: ['entity-stage-details'] });
      queryClient.refetchQueries({ queryKey: ['landlord-placement-fees'] });
      queryClient.refetchQueries({ queryKey: ['property-units'] });

      toast.success('Placement fee payment recorded successfully');
    },
    onError: (error: Error) => {
      console.error('Error recording placement fee payment:', error);
      toast.error(error.message || 'Failed to record placement fee payment');
    },
  });
};
