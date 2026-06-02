// Shared inspection assignment scoring used both client-side (suggested inspector preview)
// and server-side (auto-assign edge function via duplicated logic). Pure functions only.

export interface InspectorCandidate {
  id: string;            // agency_staff.id
  user_id: string;
  full_name: string;
  territory_zips: string[] | null;
  scheduled_count: number;
  in_progress_count: number;
  recent_decline_count: number;
  out_of_office: boolean;
}

export interface InspectionContext {
  property_zip?: string | null;
  recently_declined_inspector_ids?: string[];
}

export type AssignmentStrategy =
  | 'territory_workload_roundrobin'
  | 'workload_only'
  | 'roundrobin_only';

export interface ScoredCandidate extends InspectorCandidate {
  score: number;
  reasons: string[];
  workload: number;
  territory_match: boolean;
}

export function scoreCandidates(
  candidates: InspectorCandidate[],
  ctx: InspectionContext,
  strategy: AssignmentStrategy = 'territory_workload_roundrobin',
): ScoredCandidate[] {
  const declined = new Set(ctx.recently_declined_inspector_ids || []);
  return candidates
    .filter(c => !c.out_of_office)
    .filter(c => !declined.has(c.id))
    .map(c => {
      const workload = c.scheduled_count + c.in_progress_count;
      const territoryMatch = !!(
        ctx.property_zip &&
        c.territory_zips &&
        c.territory_zips.includes(ctx.property_zip)
      );
      const reasons: string[] = [];
      let score = 0;

      if (strategy === 'territory_workload_roundrobin') {
        if (territoryMatch) {
          score += 1000;
          reasons.push('Territory match');
        }
        score += Math.max(0, 100 - workload * 5);
        reasons.push(`Workload: ${workload}`);
      } else if (strategy === 'workload_only') {
        score += Math.max(0, 100 - workload * 5);
        reasons.push(`Workload: ${workload}`);
      } else {
        // roundrobin_only — lowest workload still wins, but no territory bonus
        score += Math.max(0, 100 - workload * 2);
        reasons.push(`Round-robin (load ${workload})`);
      }

      // Decline penalty
      if (c.recent_decline_count > 0) {
        score -= c.recent_decline_count * 10;
        reasons.push(`Recent declines: ${c.recent_decline_count}`);
      }

      return { ...c, score, reasons, workload, territory_match: territoryMatch };
    })
    .sort((a, b) => b.score - a.score);
}

export function pickBestInspector(
  candidates: InspectorCandidate[],
  ctx: InspectionContext,
  strategy: AssignmentStrategy = 'territory_workload_roundrobin',
): ScoredCandidate | null {
  const scored = scoreCandidates(candidates, ctx, strategy);
  return scored[0] || null;
}

export function extractZip(address?: string | null): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}
