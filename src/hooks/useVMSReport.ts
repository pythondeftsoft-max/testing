import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VMSMonth {
  month: string;
  allocated: number;
  leased: number;
  utilizationPct: number;
  hapExpense: number;
}

export function useVMSReport(agencyId: string) {
  const [data, setData] = useState<VMSMonth[]>([]);
  const [summary, setSummary] = useState({ totalAllocated: 0, totalLeased: 0, utilizationPct: 0, totalHAP: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: vouchers } = await supabase
        .from('agency_vouchers')
        .select('status, issued_at, created_at')
        .eq('agency_id', agencyId);

      const { data: leases } = await supabase
        .from('tenant_leases')
        .select('lease_category, hap_amount, lease_start, status')
        .eq('agency_id', agencyId)
        .eq('lease_category', 'voucher');

      const allVouchers = vouchers || [];
      const allLeases = leases || [];

      const totalAllocated = allVouchers.length;
      const totalLeased = allVouchers.filter((v: any) => v.status === 'leased_up').length;
      const totalHAP = allLeases
        .filter((l: any) => l.status === 'active')
        .reduce((sum: number, l: any) => sum + (l.hap_amount || 0), 0);
      const utilizationPct = totalAllocated > 0 ? Math.round((totalLeased / totalAllocated) * 100) : 0;

      setSummary({ totalAllocated, totalLeased, utilizationPct, totalHAP });

      // Group by month
      const monthMap: Record<string, { allocated: number; leased: number }> = {};
      allVouchers.forEach((v: any) => {
        const date = v.issued_at || v.created_at;
        if (!date) return;
        const m = date.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { allocated: 0, leased: 0 };
        monthMap[m].allocated++;
        if (v.status === 'leased_up') monthMap[m].leased++;
      });

      const months = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, d]) => ({
          month,
          allocated: d.allocated,
          leased: d.leased,
          utilizationPct: d.allocated > 0 ? Math.round((d.leased / d.allocated) * 100) : 0,
          hapExpense: 0,
        }));

      setData(months);
      setLoading(false);
    };
    fetch();
  }, [agencyId]);

  return { data, summary, loading };
}
