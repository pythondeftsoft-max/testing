import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExistingTag {
  id: string;
  amount: number;
  tag_type: string;
  deposit_description: string | null;
  deposit_date: string;
}

export interface UntaggedProperty {
  unit_id: string;
  unit_number: string;
  unit_name: string | null;
  property_id: string;
  property_address: string;
  portfolio_id: string | null;
  portfolio_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  required_rent: number;
  hap_expected: number;
  tenant_expected: number;
  tenant_expected_raw?: number; // Actual tenant portion before Stripe adjustment
  tenant_collection_method: 'stripe' | 'external';
  hap_tagged: number;
  tenant_tagged: number;
  hap_remaining: number;
  tenant_remaining: number;
  amount_tagged: number;
  remaining: number;
  is_complete: boolean;
  existing_tags: ExistingTag[];
  tagged_deposits: Array<{
    description: string | null;
    amount: number;
    tag_type: string;
    date: string;
  }> | null;
}

export interface TaggedTransaction {
  id: string;
  transaction_date: string;
  last_tracked_date: string; // Most recent payment date from this recurring source
  amount: number;
  description: string | null;
  display_name: string | null;
  merchant_name: string | null;
  tag_type: string | null;
  total_tagged: number;
  remaining_balance: number;
  units_tagged_count: number;
  status: 'balanced' | 'remaining' | 'over';
  bank_account?: {
    id: string;
    institution_name: string;
    account_name: string;
    mask?: string;
  } | null;
  splits: Array<{
    id: string;
    amount: number;
    tag_type: string;
    property?: { id: string; address: string } | null;
    unit?: { id: string; unit_number: string; unit_name: string | null } | null;
    portfolio_name?: string;
    tenant_name?: string | null;
    rent_info?: {
      total: number;
      hap: number;
      tenant: number;
      tenant_collection_method?: 'stripe' | 'external';
    } | null;
  }>;
}

export interface AvailableDeposit {
  id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  display_name: string | null;
  merchant_name: string | null;
  is_tagged: boolean;
  tag_type: string | null;
  used_amount: number;
  available_amount: number;
  bank_account?: {
    id: string;
    institution_name: string;
    account_name: string;
  } | null;
}

const QUERY_KEYS = {
  untaggedProperties: (period: { year: number; month: number }) => 
    ['payment-tagging', 'untagged-properties', period],
  taggedTransactions: (filters: object) => 
    ['payment-tagging', 'tagged-transactions', filters],
  availableDeposits: ['payment-tagging', 'available-deposits'],
  stats: ['payment-tagging', 'stats'],
};

export const useUntaggedProperties = (period: { year: number; month: number }) => {
  return useQuery({
    queryKey: QUERY_KEYS.untaggedProperties(period),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_untagged_properties', ...period },
      });
      if (error) throw error;
      return data as {
        properties: UntaggedProperty[];
        period: { year: number; month: number };
        totalUnits: number;
        untaggedCount: number;
      };
    },
    staleTime: 30000,
  });
};

export const useTaggedTransactions = (filters: { minAmount?: number; limit?: number; offset?: number } = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.taggedTransactions(filters),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_tagged_transactions', ...filters },
      });
      if (error) throw error;
      return data as { transactions: TaggedTransaction[]; total: number };
    },
    staleTime: 30000,
  });
};

export const useAvailableDeposits = () => {
  return useQuery({
    queryKey: QUERY_KEYS.availableDeposits,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_available_deposits' },
      });
      if (error) throw error;
      return data as { deposits: AvailableDeposit[] };
    },
    staleTime: 30000,
  });
};

export const useTagPropertyPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      transactionId: string;
      propertyId?: string;
      unitId?: string;
      amount?: number;
      tagType?: string;
      notes?: string;
      markAsTracked?: boolean;
      createAutoTagRule?: boolean;
      transactionDescription?: string;
    }) => {
      const action = params.markAsTracked ? 'mark_as_tracked' : 'tag_property_payment';
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      // Only show toast for individual tag, not bulk operations
      if (!variables.markAsTracked) {
        toast.success('Payment tagged successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to tag payment: ${error.message}`);
    },
  });
};

export const useDeletePaymentTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { splitId: string }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'delete_payment_tag', splitId: params.splitId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      toast.success('Payment tag removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove tag: ${error.message}`);
    },
  });
};

export const useUpdatePaymentTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      splitId: string; 
      amount?: number; 
      tagType?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'update_payment_tag', ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      toast.success('Payment tag updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });
};

export const useStopTracking = () => {
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
      queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-plaid-transactions'] });
      toast.success('Payment tracking stopped');
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop tracking: ${error.message}`);
    },
  });
};

export const usePaymentTaggingStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-plaid-transactions', {
        body: { action: 'get_stats' },
      });
      if (error) throw error;
      return data as {
        untaggedCount: number;
        amountTaggedToProperties: number;
        amountTrackedFromPlaid: number;
        totalTransactions: number;
        activeRulesCount: number;
      };
    },
    staleTime: 60000,
  });
};
