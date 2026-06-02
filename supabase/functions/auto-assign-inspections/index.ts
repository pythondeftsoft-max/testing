// Auto-assigns inspections to inspectors based on territory + workload + round-robin.
// Modes:
//   - { inspectionId } → assign one specific inspection
//   - { agencyId, batch: true } → assign every unassigned inspection in the agency
// Always 200 OK; errors returned in the body. Logs to auto_assignment_logs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Strategy = 'territory_workload_roundrobin' | 'workload_only' | 'roundrobin_only';

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  territory_zips: string[] | null;
  scheduled_count: number;
  in_progress_count: number;
  out_of_office: boolean;
}

function extractZip(address?: string | null): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

function pickBest(
  cands: Candidate[],
  zip: string | null,
  strategy: Strategy,
  excludeIds: Set<string>,
): Candidate | null {
  const eligible = cands.filter(c => !c.out_of_office && !excludeIds.has(c.id));
  if (!eligible.length) return null;
  const scored = eligible.map(c => {
    const workload = c.scheduled_count + c.in_progress_count;
    let score = 0;
    if (strategy === 'territory_workload_roundrobin') {
      if (zip && c.territory_zips?.includes(zip)) score += 1000;
      score += Math.max(0, 100 - workload * 5);
    } else if (strategy === 'workload_only') {
      score += Math.max(0, 100 - workload * 5);
    } else {
      score += Math.max(0, 100 - workload * 2);
    }
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { inspectionId, agencyId, batch } = body as {
      inspectionId?: string;
      agencyId?: string;
      batch?: boolean;
    };

    // Resolve target inspections
    let inspections: any[] = [];
    let resolvedAgencyId = agencyId || '';

    if (inspectionId) {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();
      if (error || !data) {
        return new Response(JSON.stringify({ success: false, error: 'Inspection not found' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      inspections = [data];
      resolvedAgencyId = data.agency_id;
    } else if (batch && agencyId) {
      const { data } = await supabase
        .from('inspections')
        .select('*')
        .eq('agency_id', agencyId)
        .is('inspector_id', null)
        .in('status', ['scheduled', 'requested'])
        .order('requested_at', { ascending: true, nullsFirst: false })
        .limit(200);
      inspections = data || [];
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Provide inspectionId or {agencyId, batch:true}' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!inspections.length) {
      return new Response(JSON.stringify({ success: true, assigned: [], skipped: [], message: 'Nothing to assign' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load agency strategy
    const { data: settings } = await supabase
      .from('agency_operational_settings')
      .select('inspection_assignment_strategy')
      .eq('agency_id', resolvedAgencyId)
      .maybeSingle();
    const strategy = (settings?.inspection_assignment_strategy || 'territory_workload_roundrobin') as Strategy;

    // Load inspector roster + workload
    const { data: staff } = await supabase
      .from('agency_staff')
      .select('id, user_id, territory_zips, profiles!agency_staff_user_id_fkey(full_name)')
      .eq('agency_id', resolvedAgencyId)
      .eq('role', 'inspector')
      .eq('is_active', true);

    if (!staff?.length) {
      return new Response(JSON.stringify({ success: true, assigned: [], skipped: inspections.map(i => ({ id: i.id, reason: 'No active inspectors' })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Workload counts (open inspections per inspector)
    const inspectorIds = staff.map((s: any) => s.id);
    const { data: workloadRows } = await supabase
      .from('inspections')
      .select('inspector_id, status')
      .eq('agency_id', resolvedAgencyId)
      .in('inspector_id', inspectorIds)
      .in('status', ['scheduled', 'in_progress']);

    const workloadByInspector = new Map<string, { scheduled: number; in_progress: number }>();
    (workloadRows || []).forEach((r: any) => {
      const cur = workloadByInspector.get(r.inspector_id) || { scheduled: 0, in_progress: 0 };
      if (r.status === 'scheduled') cur.scheduled++;
      else if (r.status === 'in_progress') cur.in_progress++;
      workloadByInspector.set(r.inspector_id, cur);
    });

    let candidates: Candidate[] = staff.map((s: any) => {
      const w = workloadByInspector.get(s.id) || { scheduled: 0, in_progress: 0 };
      return {
        id: s.id,
        user_id: s.user_id,
        full_name: s.profiles?.full_name || 'Inspector',
        territory_zips: s.territory_zips,
        scheduled_count: w.scheduled,
        in_progress_count: w.in_progress,
        out_of_office: false,
      };
    });

    const assigned: any[] = [];
    const skipped: any[] = [];

    // Track per-batch picks so we don't dogpile one inspector
    for (const insp of inspections) {
      const excludeIds = new Set<string>();
      if (insp.declined_by) {
        // Skip the inspector who declined this exact inspection
        const declinedStaff = staff.find((s: any) => s.user_id === insp.declined_by);
        if (declinedStaff) excludeIds.add(declinedStaff.id);
      }

      // Resolve ZIP
      let zip: string | null = null;
      if (insp.unit_id) {
        const { data: unit } = await supabase
          .from('property_units')
          .select('zip_code')
          .eq('id', insp.unit_id)
          .maybeSingle();
        zip = (unit as any)?.zip_code || null;
      }
      if (!zip && insp.hap_contract_id) {
        const { data: hap } = await supabase
          .from('agency_hap_contracts')
          .select('property_address')
          .eq('id', insp.hap_contract_id)
          .maybeSingle();
        zip = extractZip((hap as any)?.property_address);
      }
      if (!zip && insp.property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('zip_code')
          .eq('id', insp.property_id)
          .maybeSingle();
        zip = (prop as any)?.zip_code || null;
      }

      const pick = pickBest(candidates, zip, strategy, excludeIds);
      if (!pick) {
        skipped.push({ id: insp.id, reason: 'No eligible inspector (territory/decline filters exhausted)' });
        continue;
      }

      // Update inspection
      const updates: any = {
        inspector_id: pick.user_id,
        assignment_mode: 'auto',
      };
      if (insp.status === 'requested') updates.status = 'scheduled';

      const { error: updErr } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', insp.id);

      if (updErr) {
        skipped.push({ id: insp.id, reason: updErr.message });
        continue;
      }

      // Increment local workload so next pick is fair
      const cIdx = candidates.findIndex(c => c.id === pick.id);
      if (cIdx >= 0) candidates[cIdx].scheduled_count++;

      // Log
      await supabase.from('auto_assignment_logs').insert({
        entity_type: 'inspection',
        entity_id: insp.id,
        assigned_to: pick.user_id,
        agency_id: resolvedAgencyId,
        strategy: strategy,
        reason: `Auto-assigned (zip=${zip ?? 'n/a'}, territory_match=${zip && pick.territory_zips?.includes(zip) ? 'yes' : 'no'})`,
      } as any).then(() => {}).catch(() => {});

      assigned.push({
        id: insp.id,
        inspector_user_id: pick.user_id,
        inspector_name: pick.full_name,
        territory_match: !!(zip && pick.territory_zips?.includes(zip)),
      });
    }

    return new Response(JSON.stringify({ success: true, assigned, skipped, strategy }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('auto-assign-inspections error', e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
