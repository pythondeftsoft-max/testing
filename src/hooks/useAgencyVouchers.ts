import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgencyVoucher {
  id: string;
  agency_id: string;
  tenant_id: string;
  voucher_number: string | null;
  voucher_type: string;
  status: string;
  amount: number | null;
  issued_at: string | null;
  expires_at: string | null;
  notes: string | null;
  ported_from_agency_id: string | null;
  ported_to_agency_id: string | null;
  created_at: string;
  shopping_deadline: string | null;
  extension_count: number;
  extension_days: number;
  lifecycle_status: string;
  leased_up_at: string | null;
}

export function useAgencyVouchers(agencyId: string) {
  const [vouchers, setVouchers] = useState<AgencyVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVouchers = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_vouchers')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load vouchers');
    setVouchers((data as unknown as AgencyVoucher[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const issueVoucher = async (voucher: { agency_id: string; tenant_id: string; voucher_type: string; voucher_number?: string; status?: string; amount?: number; issued_at?: string; expires_at?: string; notes?: string }) => {
    const { error } = await supabase.from('agency_vouchers').insert(voucher as any);
    if (error) { toast.error('Failed to issue voucher'); return; }
    toast.success('Voucher issued');
    fetchVouchers();
  };

  return { vouchers, loading, refetch: fetchVouchers, issueVoucher };
}
