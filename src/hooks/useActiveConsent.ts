import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns whether the given user has an active (signed, non-expired, non-revoked)
 * consent of the requested type. Wraps the SQL helper `has_active_consent`.
 *
 * Use to gate actions like RFTA submission, EIV pulls, background checks.
 */
export const useActiveConsent = (userId: string | null | undefined, consentType: string) => {
  return useQuery({
    queryKey: ['active-consent', userId, consentType],
    enabled: !!userId && !!consentType,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_active_consent', {
        _user_id: userId,
        _consent_type: consentType,
      });
      if (error) throw error;
      return data === true;
    },
    staleTime: 60_000,
  });
};
