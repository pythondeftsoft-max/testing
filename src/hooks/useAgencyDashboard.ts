import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AgencyStats {
  totalTenants: number;
  pendingRfta: number;
  scheduledInspections: number;
  activeVouchers: number;
  activeLeases: number;
  expiringSoon: number;
  placementRate: number;
  waitlistPending: number;
  waitlistTotal: number;
  avgDaysOnWaitlist: number;
}

interface AgencyTenant {
  id: string;
  user_id: string;
  voucher_status: string | null;
  housing_authority: string | null;
  city: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useAgencyDashboard(agencyId: string, role: string, staffId: string) {
  const [stats, setStats] = useState<AgencyStats>({
    totalTenants: 0, pendingRfta: 0, scheduledInspections: 0, activeVouchers: 0,
    activeLeases: 0, expiringSoon: 0, placementRate: 0,
    waitlistPending: 0, waitlistTotal: 0, avgDaysOnWaitlist: 0,
  });
  const [tenants, setTenants] = useState<AgencyTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    fetchAll();
  }, [agencyId, role, staffId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchTenants()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const [tenantsRes, rftaRes, inspRes, voucherRes, appsRes] = await Promise.all([
      supabase.from('tenant_profiles').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.from('rfta_packets').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).in('status', ['submitted', 'under_review']),
      supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('status', 'scheduled'),
      supabase.from('agency_vouchers').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('status', 'active'),
      supabase.from('voucher_applications').select('id, status, created_at').eq('agency_id', agencyId),
    ]);

    const totalTenants = tenantsRes.count ?? 0;
    const activeVouchers = voucherRes.count ?? 0;
    const activeLeases = activeVouchers;
    const expiringSoon = 0;
    const placementRate = totalTenants > 0 ? Math.round((activeVouchers / totalTenants) * 100) : 0;

    // Waitlist stats
    const allApps = appsRes.data || [];
    const waitlistPending = allApps.filter(a => a.status === 'pending').length;
    const waitlistTotal = allApps.length;
    const waitlisted = allApps.filter(a => a.status === 'waitlisted' || a.status === 'approved');
    const avgDaysOnWaitlist = waitlisted.length > 0
      ? Math.round(waitlisted.reduce((sum, a) => sum + (Date.now() - new Date(a.created_at).getTime()), 0) / waitlisted.length / (1000 * 60 * 60 * 24))
      : 0;

    setStats({
      totalTenants,
      pendingRfta: rftaRes.count ?? 0,
      scheduledInspections: inspRes.count ?? 0,
      activeVouchers,
      activeLeases,
      expiringSoon,
      placementRate,
      waitlistPending,
      waitlistTotal,
      avgDaysOnWaitlist,
    });
  };

  const fetchTenants = async () => {
    if (role === 'caseworker') {
      const { data: assignments } = await supabase
        .from('caseworker_assignments')
        .select('tenant_id')
        .eq('caseworker_id', staffId)
        .eq('is_active', true);

      if (!assignments?.length) { setTenants([]); return; }

      const tenantIds = assignments.map(a => a.tenant_id);
      const { data } = await supabase
        .from('tenant_profiles')
        .select('id, user_id, voucher_status, housing_authority, city, created_at, profiles:user_id(full_name, email)')
        .in('user_id', tenantIds);

      setTenants((data as unknown as AgencyTenant[]) || []);
    } else if (role === 'inspector' || role === 'viewer') {
      setTenants([]);
    } else {
      const { data } = await supabase
        .from('tenant_profiles')
        .select('id, user_id, voucher_status, housing_authority, city, created_at, profiles:user_id(full_name, email)')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(200);

      setTenants((data as unknown as AgencyTenant[]) || []);
    }
  };

  return { stats, tenants, loading, refetch: fetchAll };
}
