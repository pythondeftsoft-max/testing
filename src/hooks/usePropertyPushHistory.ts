import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PushTimelineEvent {
  id: string;
  pushed_at: string;
  status: string;
  expires_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  admin_id: string | null;
  admin_name: string | null;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  notes: string | null;
}

export interface PushHistoryEntry {
  id: string;
  pushed_at: string;
  status: string;
  expires_at: string | null;
  is_expired: boolean;
  events: PushTimelineEvent;
}

/**
 * Fetch all push records for a tenant + (optionally) a specific unit/property,
 * with admin name resolved.
 */
export const usePropertyPushHistory = (
  tenantUserId: string | undefined,
  unitId?: string | null,
  propertyId?: string | null
) => {
  return useQuery({
    queryKey: ['property-push-history', tenantUserId, unitId, propertyId],
    queryFn: async (): Promise<PushHistoryEntry[]> => {
      if (!tenantUserId) return [];

      let query = supabase
        .from('property_pushes')
        .select('id, pushed_at, status, expires_at, email_sent, email_sent_at, admin_id, landlord_signed_at, tenant_signed_at, notes, unit_id, property_id')
        .eq('tenant_id', tenantUserId)
        .order('pushed_at', { ascending: false });

      if (unitId) query = query.eq('unit_id', unitId);
      else if (propertyId) query = query.eq('property_id', propertyId);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Resolve admin names
      const adminIds = [...new Set(data.map((d: any) => d.admin_id).filter(Boolean))];
      const adminMap = new Map<string, string>();
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', adminIds);
        (profiles || []).forEach((p: any) => {
          adminMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin');
        });
      }

      const now = new Date();
      return data.map((p: any) => ({
        id: p.id,
        pushed_at: p.pushed_at,
        status: p.status,
        expires_at: p.expires_at,
        is_expired: p.expires_at ? new Date(p.expires_at) < now : false,
        events: {
          id: p.id,
          pushed_at: p.pushed_at,
          status: p.status,
          expires_at: p.expires_at,
          email_sent: p.email_sent || false,
          email_sent_at: p.email_sent_at,
          admin_id: p.admin_id,
          admin_name: p.admin_id ? adminMap.get(p.admin_id) || null : null,
          landlord_signed_at: p.landlord_signed_at,
          tenant_signed_at: p.tenant_signed_at,
          notes: p.notes,
        },
      }));
    },
    enabled: !!tenantUserId,
    staleTime: 30 * 1000,
  });
};

/**
 * Bulk fetch the latest push (per unit) for a single tenant — used by InternalMatchesView
 * to render PushHistoryPill on every match card without N queries.
 */
export const useTenantLatestPushesByUnit = (tenantUserId: string | undefined) => {
  return useQuery({
    queryKey: ['tenant-latest-pushes-by-unit', tenantUserId],
    queryFn: async () => {
      if (!tenantUserId) return new Map<string, PushHistoryEntry>();

      const { data, error } = await supabase
        .from('property_pushes')
        .select('id, pushed_at, status, expires_at, email_sent, email_sent_at, admin_id, landlord_signed_at, tenant_signed_at, notes, unit_id, property_id')
        .eq('tenant_id', tenantUserId)
        .order('pushed_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return new Map<string, PushHistoryEntry>();

      const adminIds = [...new Set(data.map((d: any) => d.admin_id).filter(Boolean))];
      const adminMap = new Map<string, string>();
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', adminIds);
        (profiles || []).forEach((p: any) => {
          adminMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin');
        });
      }

      const now = new Date();
      const map = new Map<string, PushHistoryEntry>();
      data.forEach((p: any) => {
        const key = p.unit_id || p.property_id;
        if (!key || map.has(key)) return; // first wins (already ordered desc)
        map.set(key, {
          id: p.id,
          pushed_at: p.pushed_at,
          status: p.status,
          expires_at: p.expires_at,
          is_expired: p.expires_at ? new Date(p.expires_at) < now : false,
          events: {
            id: p.id,
            pushed_at: p.pushed_at,
            status: p.status,
            expires_at: p.expires_at,
            email_sent: p.email_sent || false,
            email_sent_at: p.email_sent_at,
            admin_id: p.admin_id,
            admin_name: p.admin_id ? adminMap.get(p.admin_id) || null : null,
            landlord_signed_at: p.landlord_signed_at,
            tenant_signed_at: p.tenant_signed_at,
            notes: p.notes,
          },
        });
      });
      return map;
    },
    enabled: !!tenantUserId,
    staleTime: 30 * 1000,
  });
};

/**
 * Bulk fetch the latest push (per tenant) for a single unit — used by TenantMatchesView
 * (Property → Tenant mode).
 */
export const useUnitLatestPushesByTenant = (unitId: string | undefined) => {
  return useQuery({
    queryKey: ['unit-latest-pushes-by-tenant', unitId],
    queryFn: async () => {
      if (!unitId) return new Map<string, PushHistoryEntry>();

      const { data, error } = await supabase
        .from('property_pushes')
        .select('id, pushed_at, status, expires_at, email_sent, email_sent_at, admin_id, landlord_signed_at, tenant_signed_at, notes, unit_id, tenant_id')
        .eq('unit_id', unitId)
        .order('pushed_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return new Map<string, PushHistoryEntry>();

      const adminIds = [...new Set(data.map((d: any) => d.admin_id).filter(Boolean))];
      const adminMap = new Map<string, string>();
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', adminIds);
        (profiles || []).forEach((p: any) => {
          adminMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin');
        });
      }

      const now = new Date();
      const map = new Map<string, PushHistoryEntry>();
      data.forEach((p: any) => {
        if (!p.tenant_id || map.has(p.tenant_id)) return;
        map.set(p.tenant_id, {
          id: p.id,
          pushed_at: p.pushed_at,
          status: p.status,
          expires_at: p.expires_at,
          is_expired: p.expires_at ? new Date(p.expires_at) < now : false,
          events: {
            id: p.id,
            pushed_at: p.pushed_at,
            status: p.status,
            expires_at: p.expires_at,
            email_sent: p.email_sent || false,
            email_sent_at: p.email_sent_at,
            admin_id: p.admin_id,
            admin_name: p.admin_id ? adminMap.get(p.admin_id) || null : null,
            landlord_signed_at: p.landlord_signed_at,
            tenant_signed_at: p.tenant_signed_at,
            notes: p.notes,
          },
        });
      });
      return map;
    },
    enabled: !!unitId,
    staleTime: 30 * 1000,
  });
};
