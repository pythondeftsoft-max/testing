import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LandlordPayoutProfile {
  id: string;
  landlord_id: string;
  portfolio_id?: string;
  recipient_name: string;
  default_payout_method: 'digital_check' | 'ach' | 'check';
  bank_account_id?: string;
  email?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  routing_number?: string;
  account_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useLandlordPayoutProfiles = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getProfiles = async (portfolioId?: string) => {
    try {
      let query = supabase
        .from('landlord_payout_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching payout profiles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch payout profiles',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const getProfileByLandlord = async (landlordId: string, portfolioId?: string) => {
    try {
      let query = supabase
        .from('landlord_payout_profiles')
        .select('*')
        .eq('landlord_id', landlordId)
        .eq('is_active', true);

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching landlord profile:', error);
      return { success: false, error: error.message };
    }
  };

  const createProfile = async (
    profile: Omit<LandlordPayoutProfile, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landlord_payout_profiles')
        .insert({
          ...profile,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Profile Created',
        description: 'Landlord payout profile created successfully',
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating payout profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payout profile',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    profileId: string,
    updates: Partial<LandlordPayoutProfile>
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landlord_payout_profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Landlord payout profile updated successfully',
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating payout profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payout profile',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProfile = async (profileId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('landlord_payout_profiles')
        .update({ is_active: false })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Profile Deleted',
        description: 'Landlord payout profile deleted successfully',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting payout profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payout profile',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    getProfiles,
    getProfileByLandlord,
    createProfile,
    updateProfile,
    deleteProfile,
  };
};