import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VMSSubmission {
  id: string;
  agency_id: string;
  period_month: string;
  units_leased: number;
  units_under_lease: number;
  hap_expense: number;
  admin_fee_earned: number;
  ud_units: number;
  port_in_units: number;
  port_out_units: number;
  fss_escrow_balance: number;
  vms_file_url: string | null;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useVMSSubmissions(agencyId: string | null) {
  return useQuery({
    queryKey: ['vms-submissions', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('agency_vms_submissions')
        .select('*')
        .eq('agency_id', agencyId)
        .order('period_month', { ascending: false })
        .limit(36);
      if (error) throw error;
      return (data || []) as VMSSubmission[];
    },
    enabled: !!agencyId,
    staleTime: 30000,
  });
}
