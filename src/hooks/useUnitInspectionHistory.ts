import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnitHistoryRow {
  unit_key: string; // unit_id || property_id
  unit_id: string | null;
  property_id: string | null;
  address: string;
  total_inspections: number;
  last_date: string | null;
  last_result: string | null;
  current_status: string | null;
  chronic_codes: string[]; // NSPIRE codes cited 2+ times
}

export interface UnitInspectionDetail {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  inspection_type: string;
  inspector_id: string | null;
  inspector_name: string;
  notes: string | null;
  archived_at: string | null;
  deficiencies: Array<{
    id: string;
    nspire_code: string | null;
    category: string;
    severity: string;
    description: string;
    location: string | null;
    photo_urls: any;
  }>;
  photos: Array<{ id: string; file_path: string; caption: string | null }>;
}

export function useUnitInspectionHistory(agencyId: string, includeArchived = false) {
  const [units, setUnits] = useState<UnitHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    let q = supabase.from('inspections')
      .select('id, unit_id, property_id, scheduled_date, completed_date, status, result')
      .eq('agency_id', agencyId)
      .order('scheduled_date', { ascending: false });
    if (!includeArchived) q = q.is('archived_at', null);

    const [insRes, defRes, propRes, unitRes] = await Promise.all([
      q,
      (supabase.from('agency_inspection_deficiencies' as any)
        .select('inspection_id, nspire_code')
        .eq('agency_id', agencyId)) as any,
      supabase.from('properties').select('id, address, city, state'),
      supabase.from('property_units').select('id, property_id, unit_number'),
    ]);

    const inspections = (insRes.data || []) as any[];
    const defs = (defRes.data || []) as any[];
    const props = new Map((propRes.data || []).map((p: any) => [p.id, p]));
    const units = new Map((unitRes.data || []).map((u: any) => [u.id, u]));

    // Group inspections by unit_key
    const byKey = new Map<string, any[]>();
    inspections.forEach(i => {
      const key = i.unit_id || i.property_id;
      if (!key) return;
      const arr = byKey.get(key) || [];
      arr.push(i);
      byKey.set(key, arr);
    });

    // NSPIRE codes per inspection
    const codesByInsp = new Map<string, string[]>();
    defs.forEach(d => {
      if (!d.nspire_code) return;
      const arr = codesByInsp.get(d.inspection_id) || [];
      arr.push(d.nspire_code);
      codesByInsp.set(d.inspection_id, arr);
    });

    const rows: UnitHistoryRow[] = Array.from(byKey.entries()).map(([key, list]) => {
      const sorted = [...list].sort((a, b) => {
        const ad = a.completed_date || a.scheduled_date || '';
        const bd = b.completed_date || b.scheduled_date || '';
        return bd.localeCompare(ad);
      });
      const latest = sorted[0];
      const unit = units.get(key);
      const propId = unit?.property_id || latest.property_id;
      const prop = propId ? props.get(propId) : null;
      const address = prop
        ? `${prop.address}${unit?.unit_number ? ` #${unit.unit_number}` : ''}${prop.city ? `, ${prop.city}` : ''}`
        : 'Unknown unit';

      // Chronic = NSPIRE code appearing on 2+ inspections for this unit
      const codeCount = new Map<string, number>();
      list.forEach(i => {
        const codes = new Set(codesByInsp.get(i.id) || []);
        codes.forEach(c => codeCount.set(c, (codeCount.get(c) || 0) + 1));
      });
      const chronic = Array.from(codeCount.entries()).filter(([, n]) => n >= 2).map(([c]) => c);

      return {
        unit_key: key,
        unit_id: latest.unit_id,
        property_id: latest.property_id,
        address,
        total_inspections: list.length,
        last_date: latest.completed_date || latest.scheduled_date,
        last_result: latest.result,
        current_status: latest.status,
        chronic_codes: chronic,
      };
    });

    rows.sort((a, b) => (b.last_date || '').localeCompare(a.last_date || ''));
    setUnits(rows);
    setLoading(false);
  }, [agencyId, includeArchived]);

  useEffect(() => { fetch(); }, [fetch]);

  return { units, loading, refetch: fetch };
}

export async function fetchUnitTimeline(
  agencyId: string,
  unitKey: string,
  unitId: string | null,
  propertyId: string | null,
  includeArchived: boolean,
): Promise<UnitInspectionDetail[]> {
  let q = supabase.from('inspections')
    .select('id, scheduled_date, completed_date, status, result, inspection_type, inspector_id, notes, archived_at, unit_id, property_id')
    .eq('agency_id', agencyId);
  if (unitId) q = q.eq('unit_id', unitId);
  else if (propertyId) q = q.eq('property_id', propertyId).is('unit_id', null);
  if (!includeArchived) q = q.is('archived_at', null);

  const { data: inspections } = await q.order('scheduled_date', { ascending: false });
  const insp = (inspections || []) as any[];
  if (!insp.length) return [];

  const ids = insp.map(i => i.id);
  const inspectorIds = Array.from(new Set(insp.map(i => i.inspector_id).filter(Boolean)));

  const [defRes, photoRes, staffRes] = await Promise.all([
    (supabase.from('agency_inspection_deficiencies' as any)
      .select('id, inspection_id, nspire_code, category, severity, description, location, photo_urls')
      .in('inspection_id', ids)) as any,
    supabase.from('inspection_photos').select('id, inspection_id, file_path, caption').in('inspection_id', ids),
    inspectorIds.length
      ? supabase.from('agency_staff')
          .select('id, profiles!agency_staff_user_id_fkey(full_name)')
          .in('id', inspectorIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const defs = (defRes.data || []) as any[];
  const photos = (photoRes.data || []) as any[];
  const nameById = new Map<string, string>();
  ((staffRes as any).data || []).forEach((s: any) => nameById.set(s.id, s.profiles?.full_name || 'Unknown'));

  return insp.map(i => ({
    id: i.id,
    scheduled_date: i.scheduled_date,
    completed_date: i.completed_date,
    status: i.status,
    result: i.result,
    inspection_type: i.inspection_type,
    inspector_id: i.inspector_id,
    inspector_name: i.inspector_id ? nameById.get(i.inspector_id) || 'Unknown' : '—',
    notes: i.notes,
    archived_at: i.archived_at,
    deficiencies: defs.filter(d => d.inspection_id === i.id),
    photos: photos.filter(p => p.inspection_id === i.id),
  }));
}

export async function setInspectionArchived(inspectionId: string, archived: boolean) {
  return supabase.from('inspections')
    .update({ archived_at: archived ? new Date().toISOString() : null } as any)
    .eq('id', inspectionId);
}
