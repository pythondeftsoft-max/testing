import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PropertyPaymentSettings {
  id: string;
  property_id: string;
  payout_bank_account_id: string | null;
  stripe_connect_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyPaymentSettingsInsert {
  property_id: string;
  payout_bank_account_id?: string | null;
  stripe_connect_account_id?: string | null;
}

export function usePropertyPaymentSettings(propertyId?: string) {
  const [settings, setSettings] = useState<PropertyPaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!propertyId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('property_payment_settings' as any)
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      setSettings((data as any) || null);
    } catch (error: any) {
      console.error('Error fetching property payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch property payment settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<PropertyPaymentSettingsInsert>) => {
    if (!propertyId) return false;

    try {
      setIsLoading(true);

      const settingsData = {
        property_id: propertyId,
        ...updates,
      };

      const { data, error } = await supabase
        .from('property_payment_settings' as any)
        .upsert(settingsData, { onConflict: 'property_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSettings(data as any);
      toast({
        title: 'Success',
        description: 'Property payment settings updated successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error updating property payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update property payment settings',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSettings = async () => {
    if (!propertyId || !settings) return false;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('property_payment_settings' as any)
        .delete()
        .eq('property_id', propertyId);

      if (error) {
        throw error;
      }

      setSettings(null);
      toast({
        title: 'Success',
        description: 'Property payment settings deleted successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting property payment settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete property payment settings',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [propertyId]);

  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings,
    deleteSettings,
    refreshSettings: fetchSettings,
  };
}