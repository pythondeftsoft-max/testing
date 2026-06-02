import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinderTenant } from './usePropertyFinder';

export type OpportunityKind = 'gap' | 'fresh' | 'stale' | 'pha_concentration';

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  subtitle: string;
  cta: string;
  metric: string;
  // Filter payload that the strip can apply to TenantFilterBar
  filter?: {
    state?: string;
    city?: string;
    bedrooms?: number[];
    housingAuthorityId?: string;
    pushed?: 'all' | 'never' | 'active' | 'expired_no_response';
  };
  // Numeric weight used for ranking
  weight: number;
  severity: 'green' | 'amber' | 'blue' | 'red';
}

interface UnitRow {
  id: string;
  property_id: string;
  bedrooms: number | null;
  property: { city: string | null; state: string | null; housing_authority_id: string | null } | null;
}

interface PushRow {
  id: string;
  pushed_at: string;
  status: string;
}

const useInventoryAndPushes = () => {
  return useQuery({
    queryKey: ['opportunity-inventory'],
    queryFn: async () => {
      const [unitsRes, pushesRes, recentPushesRes] = await Promise.all([
        supabase
          .from('property_units')
          .select(
            'id, property_id, bedrooms, properties!inner(city, state, housing_authority_id)'
          )
          .eq('on_market', true)
          .limit(2000),
        supabase
          .from('property_pushes')
          .select('id, pushed_at, status')
          .in('status', ['push_sent', 'viewed'])
          .lt('pushed_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500),
        supabase
          .from('property_units')
          .select('id, created_at, listed_date')
          .eq('on_market', true)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500),
      ]);

      const units: UnitRow[] = (unitsRes.data || []).map((u: any) => ({
        id: u.id,
        property_id: u.property_id,
        bedrooms: u.bedrooms,
        property: u.properties,
      }));

      return {
        units,
        stalePushes: (pushesRes.data || []) as PushRow[],
        freshUnits: recentPushesRes.data || [],
      };
    },
    staleTime: 60 * 1000,
  });
};

const parseTenantBedrooms = (t: FinderTenant): number[] => {
  const raw: any = (t as any).bedrooms_approved || (t as any).bedrooms_needed;
  if (Array.isArray(raw)) return raw.map((n: any) => Number(n)).filter((n) => !isNaN(n));
  if (typeof raw === 'number') return [raw];
  return [];
};

export const useOpportunityInsights = (tenants: FinderTenant[]): Opportunity[] => {
  const { data } = useInventoryAndPushes();

  return useMemo(() => {
    if (!data) return [];
    const opps: Opportunity[] = [];

    // ----- 1. State + bedroom GAP buckets (tenants waiting × units available) -----
    const bucket: Record<
      string,
      { state: string; city: string | null; bedrooms: number; tenants: number; units: number }
    > = {};

    // Index units by state+city+bedrooms
    for (const u of data.units) {
      if (!u.property?.state || u.bedrooms == null) continue;
      const state = u.property.state;
      const city = u.property.city || null;
      const br = u.bedrooms;
      const key = `${state}|${city ?? ''}|${br}`;
      if (!bucket[key]) bucket[key] = { state, city, bedrooms: br, tenants: 0, units: 0 };
      bucket[key].units += 1;
    }

    // Index tenants
    for (const t of tenants) {
      const state: string | null = (t as any).preferred_state || (t as any).state;
      if (!state) continue;
      const city = ((t as any).preferred_city || (t as any).city || null) as string | null;
      const brs = parseTenantBedrooms(t);
      const targets = brs.length > 0 ? brs : [-1];
      for (const br of targets) {
        const key = `${state}|${city ?? ''}|${br}`;
        if (!bucket[key]) bucket[key] = { state, city, bedrooms: br, tenants: 0, units: 0 };
        bucket[key].tenants += 1;
      }
    }

    Object.entries(bucket).forEach(([key, b]) => {
      if (b.tenants < 1 || b.units < 1) return;
      const overlap = Math.min(b.tenants, b.units);
      if (overlap < 1) return;
      const surplusUnits = b.units - b.tenants;
      const isGap = b.tenants >= 2 && b.units >= 1;
      if (!isGap) return;

      const where = b.city ? `${b.city}, ${b.state}` : b.state;
      const brLabel = b.bedrooms === 0 ? 'Studio' : `${b.bedrooms}BR`;

      opps.push({
        id: `gap-${key}`,
        kind: surplusUnits > 0 ? 'pha_concentration' : 'gap',
        title: `${where} — ${brLabel}`,
        subtitle:
          surplusUnits > 0
            ? `${b.tenants} tenants waiting · ${b.units} units on market (surplus)`
            : `${b.tenants} tenants waiting · ${b.units} unit${b.units > 1 ? 's' : ''} on market`,
        cta: 'Filter to this opportunity',
        metric: `${overlap} ready pair${overlap > 1 ? 's' : ''}`,
        filter: {
          state: b.state,
          city: b.city ?? undefined,
          bedrooms: b.bedrooms >= 0 ? [b.bedrooms] : undefined,
          pushed: 'never',
        },
        weight: overlap * (surplusUnits > 0 ? 1.2 : 1),
        severity: 'green',
      });
    });

    // ----- 2. Fresh inventory alert -----
    if ((data.freshUnits || []).length >= 3) {
      opps.push({
        id: 'fresh-inventory',
        kind: 'fresh',
        title: 'Fresh inventory just hit',
        subtitle: `${data.freshUnits.length} unit${data.freshUnits.length > 1 ? 's' : ''} listed in last 7 days`,
        cta: 'Review fresh units',
        metric: `${data.freshUnits.length} new`,
        weight: data.freshUnits.length * 0.5,
        severity: 'blue',
      });
    }

    // ----- 3. Stale push alert -----
    if (data.stalePushes.length >= 1) {
      opps.push({
        id: 'stale-pushes',
        kind: 'stale',
        title: 'Re-engage stale pushes',
        subtitle: `${data.stalePushes.length} push${data.stalePushes.length > 1 ? 'es' : ''} >5 days old · no response`,
        cta: 'Open reactivation',
        metric: `${data.stalePushes.length} stale`,
        weight: data.stalePushes.length * 0.7,
        severity: 'amber',
      });
    }

    // Rank and return top 4
    return opps.sort((a, b) => b.weight - a.weight).slice(0, 4);
  }, [data, tenants]);
};
