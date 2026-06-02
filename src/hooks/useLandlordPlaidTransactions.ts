import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransactionFilters {
  isTagged?: boolean;
  bankAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface PlaidTransaction {
  id: string;
  landlord_id: string;
  bank_account_id: string | null;
  plaid_transaction_id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  merchant_name: string | null;
  pending: boolean;
  category: string | null;
  plaid_data: Record<string, unknown>;
  is_tagged: boolean;
  tagged_at: string | null;
  tagged_by: string | null;
  tag_type: string | null;
  linked_rent_payment_id: string | null;
  linked_hap_payment_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; address: string } | null;
  unit?: { id: string; unit_number: string; unit_name: string | null } | null;
  bank_account?: { id: string; institution_name: string; account_name: string; account_mask: string } | null;
}

export interface TransactionStats {
  untaggedCount: number;
  taggedThisMonthAmount: number;
  totalTransactions: number;
  activeRulesCount: number;
}

export interface AutoTagRule {
  id: string;
  landlord_id: string;
  rule_name: string;
  match_type: 'description' | 'amount' | 'merchant' | 'combined';
  match_pattern: string | null;
  match_amount_min: number | null;
  match_amount_max: number | null;
  match_merchant: string | null;
  target_property_id: string;
  target_unit_id: string | null;
  tag_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  property?: { id: string; address: string } | null;
  unit?: { id: string; unit_number: string; unit_name: string | null } | null;
}

export interface PaymentSplit {
  id: string;
  transaction_id: string;
  property_id: string;
  unit_id: string | null;
  amount: number;
  tag_type: string;
  notes: string | null;
  created_at: string;
  property?: { id: string; address: string } | null;
  unit?: { id: string; unit_number: string; unit_name: string | null } | null;
}

const QUERY_KEYS = {
  transactions: (filters: TransactionFilters) => ['landlord-plaid-transactions', filters],
  stats: ['landlord-plaid-transactions', 'stats'],
  rules: ['landlord-plaid-transactions', 'rules'],
  splits: (transactionId: string) => ['landlord-plaid-transactions', 'splits', transactionId],
};

export const useLandlordPlaidTransactions = (filters: TransactionFilters = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.transactions(filters),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_transactions', ...filters },
      });
      if (error) throw error;
      return data as { transactions: PlaidTransaction[]; total: number };
    },
    staleTime: 30000,
  });
};

export const useLandlordTransactionStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_stats' },
      });
      if (error) throw error;
      return data as TransactionStats;
    },
    staleTime: 60000,
  });
};

export const useLandlordAutoTagRules = () => {
  return useQuery({
    queryKey: QUERY_KEYS.rules,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_rules' },
      });
      if (error) throw error;
      return data as { rules: AutoTagRule[] };
    },
    staleTime: 60000,
  });
};

export const useTransactionSplits = (transactionId: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.splits(transactionId || ''),
    queryFn: async () => {
      if (!transactionId) return { splits: [] };
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_splits', transactionId },
      });
      if (error) throw error;
      return data as { splits: PaymentSplit[] };
    },
    enabled: !!transactionId,
  });
};

export const useSyncTransactions = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'sync_transactions' },
      });
      if (error) throw error;
      return data as { success: boolean; syncedCount: number; message?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      if (data.syncedCount > 0) {
        toast.success(`Synced ${data.syncedCount} new transactions`);
      } else {
        toast.info(data.message || 'No new transactions found');
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
};

export const useTagTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      propertyId: string;
      unitId?: string;
      tagType: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'tag_transaction', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      toast.success('Transaction tagged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to tag: ${error.message}`);
    },
  });
};

export const useUntagTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'untag_transaction', transactionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      toast.success('Transaction untagged');
    },
    onError: (error: Error) => {
      toast.error(`Failed to untag: ${error.message}`);
    },
  });
};

export const useSplitTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      splits: Array<{
        propertyId: string;
        unitId?: string;
        amount: number;
        tagType: string;
        notes?: string;
      }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'split_transaction', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      toast.success('Payment split successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to split: ${error.message}`);
    },
  });
};

export const useCreateAutoTagRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      ruleName: string;
      matchType: 'description' | 'amount' | 'merchant' | 'combined';
      matchPattern?: string;
      matchAmountMin?: number;
      matchAmountMax?: number;
      matchMerchant?: string;
      targetPropertyId: string;
      targetUnitId?: string;
      tagType: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'create_rule', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rules });
      toast.success('Auto-tag rule created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });
};

export const useUpdateAutoTagRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      ruleId: string;
      ruleName?: string;
      matchType?: 'description' | 'amount' | 'merchant' | 'combined';
      matchPattern?: string;
      matchAmountMin?: number;
      matchAmountMax?: number;
      matchMerchant?: string;
      targetPropertyId?: string;
      targetUnitId?: string;
      tagType?: string;
      isActive?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'update_rule', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rules });
      toast.success('Rule updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });
};

export const useDeleteAutoTagRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'delete_rule', ruleId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rules });
      toast.success('Rule deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });
};

export const useApplyAutoTagRules = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'apply_rules' },
      });
      if (error) throw error;
      return data as { success: boolean; taggedCount: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      if (data.taggedCount > 0) {
        toast.success(`Auto-tagged ${data.taggedCount} transactions`);
      } else {
        toast.info('No transactions matched the rules');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply rules: ${error.message}`);
    },
  });
};

export const useUpdateTransactionDisplayName = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ transactionId, displayName }: { transactionId: string; displayName: string | null }) => {
      const { error } = await supabase
        .from('landlord_plaid_transactions')
        .update({ display_name: displayName })
        .eq('id', transactionId);
      if (error) throw error;
      return { transactionId, displayName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      toast.success('Payment name updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update name: ${error.message}`);
    },
  });
};

export const useBackfillPaymentRecords = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Get current user ID to pass explicitly as fallback
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'backfill_payment_records', landlordId: user?.id },
      });
      if (error) throw error;
      return data as { success: boolean; message: string; created: { hap: number; rent: number } };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['hap-payments'] });
      const total = data.created.hap + data.created.rent;
      if (total > 0) {
        toast.success(data.message);
      } else {
        toast.info('All payment records are already synced');
      }
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });
};
