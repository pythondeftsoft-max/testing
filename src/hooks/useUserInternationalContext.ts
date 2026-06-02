
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createInternationalContext, detectUserContext } from '@/lib/internationalUtils';
import type { InternationalContext } from '@/lib/internationalUtils';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface UserInternationalPreferences {
  preferred_country?: string;
  preferred_currency_code?: SupportedCurrency;
  address_format_preference?: 'local' | 'international';
  currency_display_preference?: 'symbol' | 'code' | 'both';
}

interface UseUserInternationalContextOptions {
  autoDetect?: boolean;
  fallbackCountry?: string;
}

export const useUserInternationalContext = (
  options: UseUserInternationalContextOptions = {}
) => {
  const { autoDetect = true, fallbackCountry = 'US' } = options;
  const [detectedContext, setDetectedContext] = useState<InternationalContext | null>(null);
  const queryClient = useQueryClient();

  // Fetch user's international preferences from profiles table
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['user-international-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_country, preferred_currency_code')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Error fetching user preferences:', error);
        return null;
      }

      return {
        preferred_country: data.preferred_country,
        preferred_currency_code: data.preferred_currency_code as SupportedCurrency,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-detect context on first load if no preferences are set
  useEffect(() => {
    const detectAndSetContext = async () => {
      if (!autoDetect || detectedContext || preferencesLoading) return;

      try {
        const context = await detectUserContext({
          country: userPreferences?.preferred_country,
          currency: userPreferences?.preferred_currency_code,
        });
        setDetectedContext(context);
      } catch (error) {
        console.warn('Error auto-detecting user context:', error);
        // Fallback to default context
        const fallbackContext = await createInternationalContext(fallbackCountry);
        setDetectedContext(fallbackContext);
      }
    };

    detectAndSetContext();
  }, [autoDetect, userPreferences, detectedContext, preferencesLoading, fallbackCountry]);

  // Create final context from preferences or detected context
  const internationalContext = useMemo<InternationalContext | null>(() => {
    if (preferencesLoading) return null;

    if (userPreferences?.preferred_country) {
      // User has explicit preferences
      return {
        countryCode: userPreferences.preferred_country,
        currency: userPreferences.preferred_currency_code || 'USD',
        locale: `en-${userPreferences.preferred_country}`,
        addressFormat: detectedContext?.addressFormat || {
          format: ['street', 'city', 'state', 'postal_code'],
          required: ['street', 'city']
        }
      };
    }

    return detectedContext;
  }, [userPreferences, detectedContext, preferencesLoading]);

  // Mutation to update user preferences
  const updatePreferences = useMutation({
    mutationFn: async (preferences: Partial<UserInternationalPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_country: preferences.preferred_country,
          preferred_currency_code: preferences.preferred_currency_code,
        })
        .eq('id', user.id);

      if (error) throw error;

      return preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-international-preferences'] });
    },
  });

  return {
    internationalContext,
    userPreferences,
    isLoading: preferencesLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
};
