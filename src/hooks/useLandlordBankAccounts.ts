import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BankAccount } from './useBankAccounts';

export const useLandlordBankAccounts = (landlordId: string | null) => {
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['landlord-bank-accounts', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];
      
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', landlordId)
        .eq('status', 'active')
        .order('is_default_for_payouts', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!landlordId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { accounts: accounts || [], isLoading, error };
};
