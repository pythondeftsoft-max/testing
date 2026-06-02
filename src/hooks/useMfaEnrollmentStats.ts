import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MfaEnrollmentStat {
  role_name: string;
  enforcement_enabled: boolean;
  total_users: number;
  enrolled_users: number;
  enrolled_pct: number;
}

export const useMfaEnrollmentStats = () => {
  return useQuery({
    queryKey: ['mfa-enrollment-stats'],
    queryFn: async (): Promise<MfaEnrollmentStat[]> => {
      const { data, error } = await supabase.rpc('get_mfa_enrollment_stats');
      if (error) throw error;
      return (data ?? []) as MfaEnrollmentStat[];
    },
    staleTime: 30_000,
  });
};
