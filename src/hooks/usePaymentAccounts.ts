import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

// Use Supabase generated types
type PaymentAccount = Database['public']['Tables']['payment_accounts']['Row'];
type PaymentAccountInsert = Database['public']['Tables']['payment_accounts']['Insert'];
type PaymentAccountUpdate = Database['public']['Tables']['payment_accounts']['Update'];

interface CreatePaymentAccountRequest {
  label: string;
  bank_name?: string;
  account_last4?: string;
  account_holder_name?: string;
  account_type?: 'checking' | 'savings';
  routing_number?: string;
  account_number?: string;
  portfolio_id?: string;
  is_default?: boolean;
}

export const usePaymentAccounts = (userId: string, portfolioId?: string) => {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('payment_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.or(`portfolio_id.eq.${portfolioId},portfolio_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching payment accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (request: CreatePaymentAccountRequest) => {
    setIsLoading(true);
    try {
      // This method is now deprecated in favor of direct edge function calls
      // Keeping for backward compatibility but recommending direct edge function usage
      const { data, error } = await supabase.functions.invoke('checkbook-add-funding-source', {
        body: {
          ...request,
          portfolio_id: request.portfolio_id
        }
      });

      if (error) throw error;

      toast({
        title: "Bank Account Linked",
        description: `"${request.label}" has been successfully linked`,
      });

      await fetchAccounts();
      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Error linking bank account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link bank account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccount = async (accountId: string, updates: Partial<PaymentAccountUpdate>) => {
    setIsLoading(true);
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('payment_accounts')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data, error } = await supabase
        .from('payment_accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: `Payment account has been updated`,
      });

      await fetchAccounts();
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating payment account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment account",
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
        .from('payment_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Payment account has been removed",
      });

      await fetchAccounts();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting payment account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment account",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const setAsDefault = async (accountId: string) => {
    return updateAccount(accountId, { is_default: true });
  };

  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId, portfolioId]);

  return {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    setAsDefault,
    refreshAccounts: fetchAccounts
  };
};