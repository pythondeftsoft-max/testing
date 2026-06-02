import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserBankAccount {
  id: string;
  institution_name: string;
  account_name: string;
  mask: string | null;
  account_type: string | null;
}

export const useUserBankAccounts = () => {
  return useQuery({
    queryKey: ['user-bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('id, institution_name, account_name, mask, account_type')
        .eq('user_id', user.id)
        .in('status', ['active', 'linked'])
        .is('removed_at', null)
        .order('institution_name');

      if (error) throw error;
      return data as UserBankAccount[];
    },
    staleTime: 60000,
  });
};
