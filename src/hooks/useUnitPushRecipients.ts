import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitPushRecipient {
  push_id: string;
  tenant_id: string;
  tenant_name: string;
  pushed_at: string;
  status: string;
  is_expired: boolean;
  expires_at: string | null;
  admin_name: string | null;
}

/**
 * Lists every tenant a given unit has been pushed to (latest push per tenant).
 * Ordered most recent first.
 */
export const useUnitPushRecipients = (unitId: string | null | undefined) => {
  return useQuery({
    queryKey: ['unit-push-recipients', unitId],
    queryFn: async (): Promise<UnitPushRecipient[]> => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from('property_pushes')
        .select('id, tenant_id, pushed_at, status, expires_at, admin_id')
        .eq('unit_id', unitId)
        .order('pushed_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Dedupe — keep most recent push per tenant
      const latestByTenant = new Map<string, any>();
      data.forEach((row: any) => {
        if (!row.tenant_id) return;
        if (!latestByTenant.has(row.tenant_id)) {
          latestByTenant.set(row.tenant_id, row);
        }
      });

      const rows = Array.from(latestByTenant.values());
      const tenantIds = rows.map(r => r.tenant_id);
      const adminIds = [...new Set(rows.map(r => r.admin_id).filter(Boolean))];

      const [tenantProfiles, adminProfiles] = await Promise.all([
        tenantIds.length
          ? supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds)
          : Promise.resolve({ data: [] }),
        adminIds.length
          ? supabase.from('profiles').select('id, first_name, last_name').in('id', adminIds)
          : Promise.resolve({ data: [] }),
      ]);

      const tenantMap = new Map<string, string>();
      (tenantProfiles.data || []).forEach((p: any) => {
        tenantMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Tenant');
      });
      const adminMap = new Map<string, string>();
      (adminProfiles.data || []).forEach((p: any) => {
        adminMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin');
      });

      const now = new Date();
      return rows.map(r => ({
        push_id: r.id,
        tenant_id: r.tenant_id,
        tenant_name: tenantMap.get(r.tenant_id) || 'Tenant',
        pushed_at: r.pushed_at,
        status: r.status,
        is_expired: r.expires_at ? new Date(r.expires_at) < now : false,
        expires_at: r.expires_at,
        admin_name: r.admin_id ? adminMap.get(r.admin_id) || null : null,
      }));
    },
    enabled: !!unitId,
    staleTime: 30 * 1000,
  });
};
