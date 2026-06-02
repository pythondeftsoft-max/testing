import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type StripeConnectAccount = Database['public']['Tables']['stripe_connect_accounts']['Row'];
type StripeConnectAccountInsert = Database['public']['Tables']['stripe_connect_accounts']['Insert'];

export const useStripeConnectAccounts = (userId: string) => {
  const [accounts, setAccounts] = useState<StripeConnectAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const accounts = data || [];
      setAccounts(accounts);
      
      // Auto-sync if no accounts exist
      if (accounts.length === 0) {
        console.log('useStripeConnectAccounts: No accounts found, attempting sync...');
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('create-stripe-connect-account', {
            body: { sync_only: true }
          });

          if (!syncError) {
            console.log('useStripeConnectAccounts: Sync completed, refetching...');
            // Refetch after sync
            const { data: refreshedData, error: refreshError } = await supabase
              .from('stripe_connect_accounts')
              .select('*')
              .eq('user_id', userId)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: false });
            
            if (!refreshError && refreshedData) {
              setAccounts(refreshedData);
            }
          }
        } catch (syncError) {
          console.log('useStripeConnectAccounts: Sync failed, continuing with empty accounts');
        }
      }
    } catch (error: any) {
      console.error('Error fetching Stripe Connect accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Stripe Connect accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (accountData: {
    account_name: string;
    business_type?: string;
    business_name?: string;
    email?: string;
  }) => {
    setIsLoading(true);
    try {
      // Create Stripe Connect account
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          account_name: accountData.account_name,
          business_type: accountData.business_type,
          business_name: accountData.business_name,
          email: accountData.email,
        }
      });

      if (stripeError) throw stripeError;

      // Store account in database
      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .insert({
          user_id: userId,
          stripe_account_id: stripeData.account_id,
          account_name: accountData.account_name,
          business_type: accountData.business_type,
          business_name: accountData.business_name,
          email: accountData.email,
          onboarding_complete: stripeData.onboarding_complete || false,
          charges_enabled: stripeData.charges_enabled || false,
          payouts_enabled: stripeData.payouts_enabled || false,
          requirements_pending: stripeData.requirements || [],
          external_accounts: stripeData.external_accounts || [],
          payout_schedule: stripeData.payout_schedule || {},
          is_default: accounts.length === 0, // First account becomes default
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Connect Account Created",
        description: `"${accountData.account_name}" has been created successfully`,
      });

      await fetchAccounts();
      
      // Return onboarding URL for immediate setup
      return { 
        success: true, 
        data,
        onboarding_url: stripeData.onboarding_url 
      };
    } catch (error: any) {
      console.error('Error creating Stripe Connect account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe Connect account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccount = async (accountId: string, updates: Partial<StripeConnectAccount>) => {
    setIsLoading(true);
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('stripe_connect_accounts')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('stripe_connect_accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: "Connect account has been updated",
      });

      await fetchAccounts();
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating Stripe Connect account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update Connect account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('stripe_connect_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Connect account has been removed",
      });

      await fetchAccounts();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting Stripe Connect account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Connect account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccount = async (accountId: string) => {
    setIsLoading(true);
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) throw new Error('Account not found');

      // Get fresh data from Stripe
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          account_id: account.stripe_account_id,
          refresh_only: true,
        }
      });

      if (stripeError) throw stripeError;

      // Update local record
      await updateAccount(accountId, {
        onboarding_complete: stripeData.onboarding_complete || false,
        charges_enabled: stripeData.charges_enabled || false,
        payouts_enabled: stripeData.payouts_enabled || false,
        requirements_pending: stripeData.requirements || [],
        external_accounts: stripeData.external_accounts || [],
        payout_schedule: stripeData.payout_schedule || {},
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error refreshing Stripe Connect account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh Connect account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId]);

  return {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    refreshAccount,
    refreshAccounts: fetchAccounts
  };
};