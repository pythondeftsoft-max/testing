
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MarketplaceAccessReason = 'none' | 'looking_for_housing' | 'landlord_shopping' | 'other';
export type RoleContext = 'tenant' | 'landlord' | 'investor' | 'none';
export type TenantMode = 'residential' | 'commercial' | 'mixed';
export type TenantMarketplaceMode = 'section8' | 'mixed';

export interface UserPreferences {
  id: string;
  user_id: string;
  active_role_context: RoleContext;
  active_tenant_mode: TenantMode;
  show_marketplace: boolean;
  tenant_marketplace_mode: TenantMarketplaceMode;
  created_at: string;
  updated_at: string;
}

export interface TenantMarketplacePreferences {
  housing_interest: boolean;
  marketplace_access_reason: MarketplaceAccessReason;
  marketplace_prompt_dismissed_at: string | null;
}

export const USER_PREFERENCES_KEYS = {
  all: ['user-preferences'] as const,
  userPreferences: (userId: string) => [...USER_PREFERENCES_KEYS.all, 'user', userId] as const,
};

export const useUserPreferences = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default preferences fallback
  const getDefaultPreferences = (uid: string): UserPreferences => ({
    id: 'default',
    user_id: uid,
    active_role_context: 'tenant',
    active_tenant_mode: 'mixed',
    show_marketplace: true,
    tenant_marketplace_mode: 'section8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: USER_PREFERENCES_KEYS.userPreferences(userId || ''),
    queryFn: async () => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching user preferences, using defaults:', error);
          return getDefaultPreferences(userId);
        }

        // If no preferences exist, try to create default ones
        if (!data) {
          try {
            const { data: newPrefs, error: insertError } = await supabase
              .from('user_preferences')
              .insert({
                user_id: userId,
                active_role_context: 'tenant',
                active_tenant_mode: 'mixed',
                show_marketplace: true,
                tenant_marketplace_mode: 'section8'
              })
              .select()
              .single();

            if (insertError) {
              console.warn('Could not create preferences, using defaults:', insertError);
              return getDefaultPreferences(userId);
            }

            return newPrefs as UserPreferences;
          } catch (insertErr) {
            console.warn('Insert failed, using defaults:', insertErr);
            return getDefaultPreferences(userId);
          }
        }

        return data as UserPreferences;
      } catch (err) {
        console.warn('Preferences unavailable, using defaults:', err);
        return getDefaultPreferences(userId);
      }
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
    retry: false, // Don't retry on failure - use defaults immediately
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...updates,
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating user preferences:', error);
        throw error;
      }

      return data as UserPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: USER_PREFERENCES_KEYS.userPreferences(data.user_id) 
      });
      // Also invalidate marketplace access since it depends on preferences
      queryClient.invalidateQueries({ 
        queryKey: ['marketplace-access', data.user_id] 
      });
      console.log('User preferences updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update user preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};

export const useTenantMarketplacePreferences = (userId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tenantPrefs, isLoading } = useQuery({
    queryKey: ['tenant-marketplace-preferences', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('housing_interest, marketplace_access_reason, marketplace_prompt_dismissed_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant marketplace preferences:', error);
        throw error;
      }

      return data as TenantMarketplacePreferences | null;
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  });

  const updateTenantPreferences = useMutation({
    mutationFn: async (updates: Partial<TenantMarketplacePreferences>) => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('tenant_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select('housing_interest, marketplace_access_reason, marketplace_prompt_dismissed_at')
        .single();

      if (error) {
        console.error('Error updating tenant marketplace preferences:', error);
        throw error;
      }

      return data as TenantMarketplacePreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['tenant-marketplace-preferences', userId] 
      });
      // Also invalidate marketplace access and tenant context
      queryClient.invalidateQueries({ 
        queryKey: ['marketplace-access', userId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['tenant-context', userId] 
      });
      console.log('Tenant marketplace preferences updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update tenant marketplace preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update marketplace preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    tenantPrefs,
    isLoading,
    updateTenantPreferences: updateTenantPreferences.mutate,
    isUpdating: updateTenantPreferences.isPending,
  };
};
