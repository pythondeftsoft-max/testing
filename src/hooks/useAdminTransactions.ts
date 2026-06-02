import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlaidTransaction {
  id: string;
  plaid_transaction_id: string;
  bank_account_id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  merchant_name: string | null;
  pending: boolean;
  category: string | null;
  plaid_data: any;
  linked_fee_id: string | null;
  matched_at: string | null;
  matched_by_user_id: string | null;
  auto_matched: boolean;
  created_at: string;
  updated_at: string;
}

export const useUnmatchedTransactions = (bankAccountId?: string) => {
  return useQuery({
    queryKey: ['unmatched-transactions', bankAccountId],
    queryFn: async () => {
      let query = supabase
        .from('plaid_admin_transactions')
        .select('*')
        .is('linked_fee_id', null)
        .order('transaction_date', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PlaidTransaction[];
    },
    enabled: true,
    staleTime: 30000,
  });
};

export const useSyncTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bankAccountId, 
      startDate, 
      endDate 
    }: { 
      bankAccountId: string; 
      startDate?: string; 
      endDate?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('fetch-admin-transactions', {
        body: {
          bank_account_id: bankAccountId,
          start_date: startDate,
          end_date: endDate,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-transactions'] });
      toast.success(
        `Synced ${data.transactions_stored} transactions. ${data.unmatched_transactions.length} unmatched.`
      );
    },
    onError: (error: Error) => {
      console.error('Error syncing transactions:', error);
      toast.error(error.message || 'Failed to sync transactions from Plaid');
    },
  });
};

export const useMatchTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      transactionId, 
      feeId 
    }: { 
      transactionId: string; 
      feeId: string;
    }) => {
      // Get transaction details
      const { data: transaction, error: txError } = await supabase
        .from('plaid_admin_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError || !transaction) throw new Error('Transaction not found');

      // Get placement fee details
      const { data: fee, error: feeError } = await supabase
        .from('landlord_placement_fees')
        .select('unit_id, tenant_id, property_id, fee_amount, application_id')
        .eq('id', feeId)
        .single();

      if (feeError || !fee) throw new Error('Placement fee not found');

      // Call the edge function that handles ALL pipeline updates
      const { error: recordError } = await supabase.functions.invoke('record-placement-fee-payment', {
        body: {
          applicationId: fee.application_id,
          unitId: fee.unit_id,
          tenantId: fee.tenant_id,
          propertyId: fee.property_id,
          feeAmount: fee.fee_amount,
          paymentDate: transaction.transaction_date,
          paymentMethod: 'plaid',
          plaidTransactionId: transactionId,
          transactionAmount: Math.abs(transaction.amount),
          transactionReference: transaction.plaid_transaction_id,
          bankName: transaction.merchant_name,
        }
      });

      if (recordError) throw recordError;

      // Expire the Stripe checkout session if one exists
      try {
        await supabase.functions.invoke('expire-stripe-checkout', {
          body: { placement_fee_id: feeId }
        });
      } catch (expireError) {
        console.error('Failed to expire Stripe checkout session:', expireError);
      }

      return { transactionId, feeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fees-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['placement-fee-status'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      toast.success('Transaction matched to placement fee successfully');
    },
    onError: (error: Error) => {
      console.error('Error matching transaction:', error);
      toast.error(error.message || 'Failed to match transaction');
    },
  });
};
