import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WalletConnection {
  id: string;
  portfolio_id: string;
  user_id: string;
  wallet_type: string;
  wallet_address: string | null;
  connection_name: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_frequency: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletConnectionParams {
  portfolio_id: string;
  wallet_type: string;
  wallet_address?: string;
  connection_name: string;
  sync_frequency?: string;
  metadata?: Record<string, any>;
}

export const useWalletConnections = (portfolioId?: string) => {
  return useQuery({
    queryKey: ['wallet-connections', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      
      const { data, error } = await supabase
        .from('wallet_connections')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WalletConnection[];
    },
    enabled: !!portfolioId,
  });
};

export const useCreateWalletConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateWalletConnectionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('wallet_connections')
        .insert([{ ...params, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-connections'] });
      toast.success('Wallet connected successfully');
    },
    onError: (error: any) => {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    },
  });
};

export const useSyncWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletId: string) => {
      // This would call an edge function to sync wallet balances
      const { data, error } = await supabase.functions.invoke('sync-wallet-balances', {
        body: { walletId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-connections'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-assets'] });
      toast.success('Wallet synced successfully');
    },
    onError: (error: any) => {
      console.error('Error syncing wallet:', error);
      toast.error('Failed to sync wallet');
    },
  });
};