import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useConnectAccountSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncAccounts = async (userId: string) => {
    if (!userId) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: { sync_only: true }
      });

      if (error) {
        console.error('Error syncing Stripe accounts:', error);
        toast({
          title: 'Sync Failed',
          description: 'Failed to sync Stripe Connect accounts',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Accounts Synced',
        description: 'Stripe Connect accounts have been synced successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error syncing accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync Stripe Connect accounts',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncAccounts,
    isSyncing,
  };
}