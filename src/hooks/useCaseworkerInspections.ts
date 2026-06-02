import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CaseworkerInspection {
  id: string;
  agency_id: string;
  unit_id: string | null;
  property_id: string | null;
  inspector_id: string | null;
  inspector_name: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  unit_address: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  deficiency_count: number;
  reschedule_reason: string | null;
}

export function useCaseworkerInspections(agencyId: string, staffId: string) {
  const [inspections, setInspections] = useState<CaseworkerInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId || !staffId) return;
    setLoading(true);

    // 1. Caseworker's tenants
    const { data: assignments } = await supabase
      .from('caseworker_assignments')
      .select('tenant_id')
      .eq('caseworker_id', staffId)
      .eq('is_active', true);

    const tenantIds = (assignments || []).map((a: any) => a.tenant_id);
    if (!tenantIds.length) {
      setInspections([]);
      setLoading(false);
      return;
    }

    // 2. Inspections directly attached to those tenants
    const { data: inspsByTenant } = await supabase
      .from('inspections')
      .select('id, agency_id, unit_id, property_id, inspector_id, tenant_id, scheduled_date, completed_date, status, result, reschedule_reason')
      .eq('agency_id', agencyId)
      .in('tenant_id', tenantIds);

    // 3. Also pick up inspections on units those tenants currently occupy via HAP
    const { data: hap } = await supabase
      .from('agency_hap_contracts')
      .select('unit_id, tenant_id')
      .eq('agency_id', agencyId)
      .in('tenant_id', tenantIds);
    const hapUnitIds = Array.from(new Set((hap || []).map((h: any) => h.unit_id).filter(Boolean)));

    let inspsByUnit: any[] = [];
    if (hapUnitIds.length) {
      const { data } = await supabase
        .from('inspections')
        .select('id, agency_id, unit_id, property_id, inspector_id, tenant_id, scheduled_date, completed_date, status, result, reschedule_reason')
        .eq('agency_id', agencyId)
        .in('unit_id', hapUnitIds);
      inspsByUnit = data || [];
    }

    const merged = new Map<string, any>();
    [...(inspsByTenant || []), ...inspsByUnit].forEach(i => merged.set(i.id, i));
    const rows = Array.from(merged.values());
    if (!rows.length) {
      setInspections([]);
      setLoading(false);
      return;
    }

    const insIds = rows.map(r => r.id);
    const inspectorIds = Array.from(new Set(rows.map(r => r.inspector_id).filter(Boolean)));
    const unitIds = Array.from(new Set(rows.map(r => r.unit_id).filter(Boolean)));
    const tenIds = Array.from(new Set(rows.map(r => r.tenant_id).filter(Boolean)));

    const [inspectorRes, unitRes, tenantRes, defRes] = await Promise.all([
      inspectorIds.length
        ? supabase.from('agency_staff').select('id, profiles!agency_staff_user_id_fkey(full_name)').in('id', inspectorIds as string[])
        : Promise.resolve({ data: [] as any[] } as any),
      unitIds.length
        ? supabase.from('property_units').select('id, address, unit_number').in('id', unitIds as string[])
        : Promise.resolve({ data: [] as any[] } as any),
      tenIds.length
        ? supabase.from('profiles').select('id, full_name').in('id', tenIds as string[])
        : Promise.resolve({ data: [] as any[] } as any),
      (supabase.from('agency_inspection_deficiencies' as any).select('inspection_id').in('inspection_id', insIds)) as any,
    ]);

    const inspectorMap = new Map<string, string | null>((inspectorRes.data || []).map((s: any) => [s.id as string, (s.profiles?.full_name as string) || null]));
    const unitMap = new Map<string, string | null>((unitRes.data || []).map((u: any) => [u.id as string, [u.address, u.unit_number].filter(Boolean).join(' #') as string | null]));
    const tenantMap = new Map<string, string | null>((tenantRes.data || []).map((t: any) => [t.id as string, (t.full_name as string) || null]));
    const defCount = new Map<string, number>();
    (defRes.data || []).forEach((d: any) => defCount.set(d.inspection_id, (defCount.get(d.inspection_id) || 0) + 1));

    const enriched: CaseworkerInspection[] = rows.map(r => ({
      id: r.id,
      agency_id: r.agency_id,
      unit_id: r.unit_id,
      property_id: r.property_id,
      inspector_id: r.inspector_id,
      inspector_name: r.inspector_id ? inspectorMap.get(r.inspector_id) || null : null,
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_id ? tenantMap.get(r.tenant_id) || null : null,
      unit_address: r.unit_id ? unitMap.get(r.unit_id) || null : null,
      scheduled_date: r.scheduled_date,
      completed_date: r.completed_date,
      status: r.status,
      result: r.result,
      deficiency_count: defCount.get(r.id) || 0,
      reschedule_reason: r.reschedule_reason,
    }));

    enriched.sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''));
    setInspections(enriched);
    setLoading(false);
  }, [agencyId, staffId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { inspections, loading, refetch: fetch };
}
