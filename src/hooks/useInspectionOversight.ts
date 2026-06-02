import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InspectorRosterRow {
  inspector_id: string;
  inspector_name: string;
  scheduled: number;
  in_progress: number;
  completed_month: number;
  pass_rate: number;
  avg_deficiencies: number;
  avg_days_to_complete: number;
  overdue: number;
  total_completed: number;
}

export interface ProgramHealthMetrics {
  total_month: number;
  pass_rate: number;
  avg_days: number;
  overdue_pct: number;
  reinspection_rate: number;
  trend: { month: string; completed: number; passed: number; failed: number; avg_def: number }[];
  top_codes: { code: string; count: number }[];
  sla: { type: string; on_time: number; total: number }[];
}

export function useInspectionOversight(agencyId: string) {
  const [roster, setRoster] = useState<InspectorRosterRow[]>([]);
  const [health, setHealth] = useState<ProgramHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [staffRes, inspRes, defRes] = await Promise.all([
      supabase.from('agency_staff')
        .select('id, profiles!agency_staff_user_id_fkey(full_name)')
        .eq('agency_id', agencyId).eq('role', 'inspector').eq('is_active', true),
      supabase.from('inspections')
        .select('id, inspector_id, scheduled_date, completed_date, status, result, created_at')
        .eq('agency_id', agencyId).is('archived_at', null),
      (supabase.from('agency_inspection_deficiencies' as any)
        .select('inspection_id, nspire_code')
        .eq('agency_id', agencyId)) as any,
    ]);

    const staff = (staffRes.data || []) as any[];
    const inspections = (inspRes.data || []) as any[];
    const defs = (defRes.data || []) as any[];

    // Deficiency map
    const defByInsp = new Map<string, any[]>();
    defs.forEach(d => {
      const arr = defByInsp.get(d.inspection_id) || [];
      arr.push(d);
      defByInsp.set(d.inspection_id, arr);
    });

    // Roster
    const rosterRows: InspectorRosterRow[] = staff.map(s => {
      const mine = inspections.filter(i => i.inspector_id === s.id);
      const completed = mine.filter(i => i.status === 'completed');
      const passes = completed.filter(i => i.result === 'pass').length;
      const completedMonth = completed.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart).length;
      const overdue = mine.filter(i =>
        i.status !== 'completed' && i.status !== 'cancelled' &&
        i.scheduled_date && new Date(i.scheduled_date) < now &&
        (now.getTime() - new Date(i.scheduled_date).getTime()) / 86400000 > 5
      ).length;
      const totalDef = completed.reduce((sum, i) => sum + (defByInsp.get(i.id)?.length || 0), 0);
      const avgDef = completed.length ? totalDef / completed.length : 0;
      const days = completed
        .filter(i => i.scheduled_date && i.completed_date)
        .map(i => (new Date(i.completed_date).getTime() - new Date(i.scheduled_date).getTime()) / 86400000);
      const avgDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
      return {
        inspector_id: s.id,
        inspector_name: s.profiles?.full_name || 'Unknown',
        scheduled: mine.filter(i => i.status === 'scheduled').length,
        in_progress: mine.filter(i => i.status === 'in_progress').length,
        completed_month: completedMonth,
        pass_rate: completed.length ? Math.round((passes / completed.length) * 100) : 0,
        avg_deficiencies: Math.round(avgDef * 10) / 10,
        avg_days_to_complete: Math.round(avgDays * 10) / 10,
        overdue,
        total_completed: completed.length,
      };
    });
    rosterRows.sort((a, b) => b.completed_month - a.completed_month);
    setRoster(rosterRows);

    // Program health
    const monthInsp = inspections.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart);
    const monthPasses = monthInsp.filter(i => i.result === 'pass').length;
    const allCompleted = inspections.filter(i => i.status === 'completed' && i.scheduled_date && i.completed_date);
    const allDays = allCompleted.map(i => (new Date(i.completed_date).getTime() - new Date(i.scheduled_date).getTime()) / 86400000);
    const overdueAll = inspections.filter(i =>
      i.status !== 'completed' && i.status !== 'cancelled' &&
      i.scheduled_date && new Date(i.scheduled_date) < now
    ).length;
    const openOrDone = inspections.filter(i => i.status !== 'cancelled').length;
    const fails = inspections.filter(i => i.result === 'fail').length;
    const totalResulted = inspections.filter(i => i.result).length;

    // Trend last 12 months
    const trend: ProgramHealthMetrics['trend'] = [];
    for (let i = 0; i < 12; i++) {
      const start = new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1);
      const end = new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i + 1, 1);
      const monthRows = inspections.filter(x =>
        x.completed_date && new Date(x.completed_date) >= start && new Date(x.completed_date) < end
      );
      const p = monthRows.filter(x => x.result === 'pass').length;
      const f = monthRows.filter(x => x.result === 'fail').length;
      const def = monthRows.reduce((sum, x) => sum + (defByInsp.get(x.id)?.length || 0), 0);
      trend.push({
        month: start.toLocaleDateString(undefined, { month: 'short' }),
        completed: monthRows.length,
        passed: p,
        failed: f,
        avg_def: monthRows.length ? Math.round((def / monthRows.length) * 10) / 10 : 0,
      });
    }

    // Top NSPIRE codes
    const codeMap = new Map<string, number>();
    defs.forEach(d => {
      if (!d.nspire_code) return;
      codeMap.set(d.nspire_code, (codeMap.get(d.nspire_code) || 0) + 1);
    });
    const topCodes = Array.from(codeMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    setHealth({
      total_month: monthInsp.length,
      pass_rate: monthInsp.length ? Math.round((monthPasses / monthInsp.length) * 100) : 0,
      avg_days: allDays.length ? Math.round((allDays.reduce((a, b) => a + b, 0) / allDays.length) * 10) / 10 : 0,
      overdue_pct: openOrDone ? Math.round((overdueAll / openOrDone) * 100) : 0,
      reinspection_rate: totalResulted ? Math.round((fails / totalResulted) * 100) : 0,
      trend,
      top_codes: topCodes,
      sla: [
        { type: 'Initial', on_time: allCompleted.filter(i => allDays[allCompleted.indexOf(i)] <= 15).length, total: allCompleted.length },
      ],
    });

    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { roster, health, loading, refetch: fetch };
}
