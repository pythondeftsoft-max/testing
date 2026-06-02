import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PortfolioPaymentSettings {
  id: string;
  portfolio_id: string;
  connect_account_id: string; // This should be a UUID referencing stripe_connect_accounts.id
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface PortfolioPaymentSettingsInsert {
  portfolio_id: string;
  connect_account_id: string; // This should be a UUID referencing stripe_connect_accounts.id
  is_default?: boolean;
  created_by: string;
}

export function usePortfolioPaymentSettings(portfolioId?: string) {
  const [settings, setSettings] = useState<PortfolioPaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!portfolioId || portfolioId === 'everything') return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_payment_settings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching portfolio payment settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error fetching portfolio payment settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<PortfolioPaymentSettingsInsert & { connect_account_id: string | null }>) => {
    if (!portfolioId) return;

    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // If connect_account_id is null, delete the setting instead of upserting
      if (updates.connect_account_id === null) {
        await deleteSettings();
        return;
      }

      const { data, error } = await supabase
        .from('portfolio_payment_settings')
        .upsert({
          portfolio_id: portfolioId,
          connect_account_id: updates.connect_account_id!,
          is_default: true,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Success",
        description: "Portfolio payment settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating portfolio payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to update portfolio payment settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSettings = async () => {
    if (!portfolioId || !settings) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('portfolio_payment_settings')
        .delete()
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(null);
      toast({
        title: "Success",
        description: "Portfolio payment settings removed",
      });
    } catch (error) {
      console.error('Error deleting portfolio payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to remove portfolio payment settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [portfolioId]);

  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings,
    deleteSettings,
    refreshSettings: fetchSettings,
  };
}