import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * MARKETPLACE MESH LAYER — READ-ONLY
 *
 * Surfaces marketplace activity (matches, tours/applications, leases, listings)
 * inside the agency portal so caseworkers get visibility without doing placement work.
 *
 * Strictly read-only. Does NOT mutate marketplace tables or workflows.
 */

export interface TenantPulse {
  tenantUserId: string;
  activeMatches: number;
  lastApplicationAt: string | null;
  lastApplicationProperty: string | null;
  hasLease: boolean;
  searchStatus: 'placed' | 'active' | 'stale' | 'inactive';
  daysSinceLastActivity: number | null;
}

/** Per-tenant marketplace pulse for a tenant detail drawer. */
export const useTenantMarketplacePulse = (tenantUserId: string | null) => {
  return useQuery({
    queryKey: ['marketplace-pulse', 'tenant', tenantUserId],
    enabled: !!tenantUserId,
    staleTime: 60_000,
    queryFn: async (): Promise<TenantPulse> => {
      if (!tenantUserId) {
        return {
          tenantUserId: '',
          activeMatches: 0,
          lastApplicationAt: null,
          lastApplicationProperty: null,
          hasLease: false,
          searchStatus: 'inactive',
          daysSinceLastActivity: null,
        };
      }

      const [appsRes, leaseRes] = await Promise.all([
        supabase
          .from('unit_applications')
          .select(`
            id,
            status,
            created_at,
            unit:property_units!unit_applications_unit_id_fkey(
              unit_number,
              property:properties(address, city, state)
            )
          `)
          .eq('tenant_id', tenantUserId)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('tenant_leases')
          .select('id, status, lease_start')
          .eq('tenant_id', tenantUserId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const apps = (appsRes.data || []) as any[];
      const activeMatches = apps.filter((a) =>
        ['pending', 'submitted', 'approved', 'in_review'].includes(a.status)
      ).length;

      const lastApp = apps[0];
      const lastApplicationAt = lastApp?.created_at ?? null;
      const prop = lastApp?.unit?.property;
      const lastApplicationProperty = prop
        ? `${prop.address ?? ''}${prop.city ? `, ${prop.city}` : ''}${prop.state ? `, ${prop.state}` : ''}`.trim()
        : null;

      const lease = (leaseRes.data || [])[0] as any;
      const hasLease = !!lease && ['active', 'signed', 'pending_move_in'].includes(lease.status);

      const daysSinceLastActivity = lastApplicationAt
        ? Math.floor((Date.now() - new Date(lastApplicationAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let searchStatus: TenantPulse['searchStatus'] = 'inactive';
      if (hasLease) searchStatus = 'placed';
      else if (daysSinceLastActivity !== null && daysSinceLastActivity <= 14) searchStatus = 'active';
      else if (daysSinceLastActivity !== null && daysSinceLastActivity <= 60) searchStatus = 'stale';

      return {
        tenantUserId,
        activeMatches,
        lastApplicationAt,
        lastApplicationProperty,
        hasLease,
        searchStatus,
        daysSinceLastActivity,
      };
    },
  });
};

export interface CaseloadFeedEvent {
  id: string;
  tenantUserId: string;
  tenantName: string;
  type: 'application' | 'lease_signed' | 'stale_searcher';
  description: string;
  occurredAt: string;
  propertyLabel?: string | null;
}

/** Marketplace activity feed for a caseworker's assigned tenants. */
export const useCaseloadMarketplaceFeed = (
  staffId: string | null,
  agencyId: string | null
) => {
  return useQuery({
    queryKey: ['marketplace-pulse', 'caseload-feed', staffId, agencyId],
    enabled: !!staffId && !!agencyId,
    staleTime: 60_000,
    queryFn: async (): Promise<CaseloadFeedEvent[]> => {
      if (!staffId || !agencyId) return [];

      // 1. Caseworker's assigned tenants
      const { data: assignments } = await supabase
        .from('caseworker_assignments')
        .select('tenant_id')
        .eq('caseworker_id', staffId)
        .eq('is_active', true);

      const tenantIds = (assignments || []).map((a: any) => a.tenant_id);
      if (!tenantIds.length) return [];

      // 2. Tenant names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', tenantIds);

      const nameById = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'Tenant';
        nameById.set(p.id, name);
      });

      // 3. Recent marketplace applications + leases
      const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [appsRes, leasesRes] = await Promise.all([
        supabase
          .from('unit_applications')
          .select(`
            id, tenant_id, status, created_at,
            unit:property_units!unit_applications_unit_id_fkey(
              unit_number,
              property:properties(address, city, state)
            )
          `)
          .in('tenant_id', tenantIds)
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('tenant_leases')
          .select('id, tenant_id, status, lease_start, created_at')
          .in('tenant_id', tenantIds)
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const events: CaseloadFeedEvent[] = [];

      (appsRes.data || []).forEach((a: any) => {
        const prop = a.unit?.property;
        const propertyLabel = prop ? `${prop.address ?? ''}${prop.city ? `, ${prop.city}` : ''}` : null;
        events.push({
          id: `app-${a.id}`,
          tenantUserId: a.tenant_id,
          tenantName: nameById.get(a.tenant_id) || 'Tenant',
          type: 'application',
          description: `Applied to ${propertyLabel || 'a unit'}`,
          occurredAt: a.created_at,
          propertyLabel,
        });
      });

      (leasesRes.data || []).forEach((l: any) => {
        if (!['active', 'signed', 'pending_move_in'].includes(l.status)) return;
        events.push({
          id: `lease-${l.id}`,
          tenantUserId: l.tenant_id,
          tenantName: nameById.get(l.tenant_id) || 'Tenant',
          type: 'lease_signed',
          description: `Signed a lease via marketplace`,
          occurredAt: l.created_at,
        });
      });

      // 4. Stale-searcher alerts (no application in 45+ days, no lease)
      const lastAppByTenant = new Map<string, string>();
      (appsRes.data || []).forEach((a: any) => {
        const prev = lastAppByTenant.get(a.tenant_id);
        if (!prev || new Date(a.created_at) > new Date(prev)) lastAppByTenant.set(a.tenant_id, a.created_at);
      });
      const tenantsWithLease = new Set(
        (leasesRes.data || [])
          .filter((l: any) => ['active', 'signed', 'pending_move_in'].includes(l.status))
          .map((l: any) => l.tenant_id)
      );
      tenantIds.forEach((tid) => {
        if (tenantsWithLease.has(tid)) return;
        const last = lastAppByTenant.get(tid);
        const days = last
          ? Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        if (days >= 45) {
          events.push({
            id: `stale-${tid}`,
            tenantUserId: tid,
            tenantName: nameById.get(tid) || 'Tenant',
            type: 'stale_searcher',
            description: last ? `No marketplace activity in ${days} days` : `No marketplace activity yet`,
            occurredAt: last || new Date(0).toISOString(),
          });
        }
      });

      events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
      return events.slice(0, 30);
    },
  });
};

export interface ServiceAreaListing {
  id: string;
  unitNumber: string | null;
  monthlyRent: number | null;
  bedrooms: number | null;
  address: string;
  city: string | null;
  state: string | null;
  acceptsHcv: boolean | null;
  listedAt: string;
}

/** New on-market listings near the agency. Filters by agency's home state/city. */
export const useServiceAreaListings = (
  agencyCity: string | null,
  agencyState: string | null
) => {
  return useQuery({
    queryKey: ['marketplace-pulse', 'service-area', agencyCity, agencyState],
    enabled: !!agencyState,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ServiceAreaListing[]> => {
      if (!agencyState) return [];

      let q = supabase
        .from('property_units')
        .select(`
          id, unit_number, monthly_rent, bedrooms, on_market, created_at,
          property:properties!inner(address, city, state, accepts_section_8)
        `)
        .eq('on_market', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data, error } = await q;
      if (error) return [];

      const rows = (data || []) as any[];
      // Client-side filter to agency's state (and city when available)
      const filtered = rows.filter((u) => {
        const p = u.property;
        if (!p) return false;
        if (p.state && agencyState && p.state.toLowerCase() !== agencyState.toLowerCase()) return false;
        return true;
      });

      const sorted = filtered.sort((a, b) => {
        if (agencyCity) {
          const aCityMatch = a.property?.city?.toLowerCase() === agencyCity.toLowerCase() ? 0 : 1;
          const bCityMatch = b.property?.city?.toLowerCase() === agencyCity.toLowerCase() ? 0 : 1;
          if (aCityMatch !== bCityMatch) return aCityMatch - bCityMatch;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return sorted.slice(0, 12).map((u) => ({
        id: u.id,
        unitNumber: u.unit_number,
        monthlyRent: u.monthly_rent,
        bedrooms: u.bedrooms,
        address: u.property?.address || '',
        city: u.property?.city || null,
        state: u.property?.state || null,
        acceptsHcv: u.property?.accepts_section_8 ?? null,
        listedAt: u.created_at,
      }));
    },
  });
};
