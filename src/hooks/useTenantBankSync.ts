import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useTenantBankSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'sync_tenant_transactions' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['self-reported-rent'] });
      queryClient.invalidateQueries({ queryKey: ['unified-rent-history'] });

      const total = data?.total_synced ?? data?.transactions_stored ?? 0;
      const from = data?.earliest_date;
      const to = data?.latest_date;
      const rangeStr = from && to ? ` History available: ${from} – ${to}` : '';
      toast({
        title: 'Bank sync complete',
        description: total > 0
          ? `Synced ${total} transactions.${rangeStr}`
          : 'Your transactions are up to date.',
      });
    },
    onError: (error: any) => {
      console.error('Bank sync error:', error);
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync bank transactions.',
        variant: 'destructive',
      });
    },
  });
}
