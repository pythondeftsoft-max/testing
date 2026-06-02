import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkBankTransactionData {
  feeId: string;
  transactionReference: string;
  transactionDate: string;
  transactionAmount: number;
  bankName: string;
  notes?: string;
}

export const useLinkBankTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: LinkBankTransactionData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('landlord_placement_fees')
        .update({
          payment_status: 'paid',
          payment_date: data.transactionDate,
          payment_method: 'bank_transfer',
          bank_transaction_reference: data.transactionReference,
          bank_transaction_date: data.transactionDate,
          bank_transaction_amount: data.transactionAmount,
          bank_name: data.bankName,
          transaction_notes: data.notes,
          linked_by_user_id: user.id,
          linked_at: new Date().toISOString(),
        })
        .eq('id', data.feeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees-analytics'] });
      toast({
        title: 'Success',
        description: 'Bank transaction linked to placement fee successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link bank transaction',
        variant: 'destructive',
      });
    },
  });
};
