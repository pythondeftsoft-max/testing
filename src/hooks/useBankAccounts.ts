import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// SECURITY: plaid_access_token is intentionally excluded - it should never be sent to frontend
export interface BankAccount {
  id: string;
  user_id: string;
  plaid_item_id: string | null;
  plaid_account_id: string;
  institution_name: string | null;
  account_name: string | null;
  mask: string | null;
  account_type: string | null;
  account_subtype: string | null;
  status: string;
  is_default_for_payments: boolean;
  is_default_for_payouts: boolean;
  last_synced_at: string | null;
  removed_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'get_accounts' }
      });

      if (error) throw error;
      
      setAccounts(data.accounts || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bank accounts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLinkToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'create_link_token' }
      });

      if (error) throw error;
      
      return data.link_token;
    } catch (error: any) {
      console.error('Error creating link token:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Plaid Link',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const exchangePublicToken = async (publicToken: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { 
          action: 'exchange_public_token',
          public_token: publicToken 
        }
      });

      if (error) throw error;
      
      const transactionsSynced = data?.transactions_synced as Record<string, { transactions_stored?: number }> | undefined;
      const syncedCount = transactionsSynced 
        ? Object.values(transactionsSynced).reduce(
            (sum, result) => sum + (result.transactions_stored || 0), 
            0
          )
        : 0;

      toast({
        title: 'Success',
        description: syncedCount > 0 
          ? `${data.message} Synced ${syncedCount} transactions.`
          : data.message || 'Bank accounts linked successfully',
      });
      
      await fetchAccounts(); // Refresh the accounts list
      return data;
    } catch (error: any) {
      console.error('Error exchanging public token:', error);
      toast({
        title: 'Error',
        description: 'Failed to link bank accounts',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { 
          action: 'disconnect_account',
          account_id: accountId 
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Account disconnected successfully',
      });
      
      await fetchAccounts(); // Refresh the accounts list
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultAccount = async (accountId: string, type: 'payments' | 'payouts') => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('plaid-payment-methods', {
        body: { 
          action: 'set_default',
          account_id: accountId,
          type 
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Default account updated successfully',
      });
      
      await fetchAccounts(); // Refresh the accounts list
    } catch (error: any) {
      console.error('Error setting default account:', error);
      toast({
        title: 'Error',
        description: 'Failed to update default account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    isLoading,
    fetchAccounts,
    createLinkToken,
    exchangePublicToken,
    disconnectAccount,
    setDefaultAccount,
  };
}