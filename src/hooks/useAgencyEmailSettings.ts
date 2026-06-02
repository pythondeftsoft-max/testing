import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgencyEmailSettings {
  id: string;
  agency_id: string;
  sender_mode: 'hybrid' | 'custom_domain';
  custom_domain: string | null;
  custom_from_email: string | null;
  domain_verified: boolean;
  monthly_addon_fee: number;
}

export const useAgencyEmailSettings = (agencyId: string | undefined) => {
  return useQuery({
    queryKey: ['agency-email-settings', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('agency_email_settings')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AgencyEmailSettings) || null;
    },
    enabled: !!agencyId,
  });
};
