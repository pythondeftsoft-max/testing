import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SEMAPIndicator {
  number: number;
  name: string;
  description: string;
  maxPoints: number;
  score: number;
  notes: string;
  autoComputed: boolean;
}

const SEMAP_DEFINITIONS: Omit<SEMAPIndicator, 'score' | 'notes' | 'autoComputed'>[] = [
  { number: 1, name: 'Selection from Waitlist', description: 'Tenant selection from the waiting list', maxPoints: 15 },
  { number: 2, name: 'Rent Reasonableness', description: 'Rents charged are reasonable compared to unassisted units', maxPoints: 20 },
  { number: 3, name: 'Determination of Adjusted Income', description: 'Correct income determination for families', maxPoints: 20 },
  { number: 4, name: 'Utility Allowance Schedule', description: 'Utility allowances are updated annually', maxPoints: 5 },
  { number: 5, name: 'HQS Quality Control Inspections', description: 'Quality of HQS inspections', maxPoints: 5 },
  { number: 6, name: 'HQS Enforcement', description: 'Timely correction of HQS deficiencies', maxPoints: 10 },
  { number: 7, name: 'Expanding Housing Opportunities', description: 'Efforts to expand housing choice', maxPoints: 5 },
  { number: 8, name: 'Payment Standards', description: 'Payment standards set correctly within FMR range', maxPoints: 5 },
  { number: 9, name: 'Timely Annual Recertifications', description: 'HQS re-examinations completed on time', maxPoints: 10 },
  { number: 10, name: 'Correct Tenant Rent Calculations', description: 'Accurate rent and HAP calculations', maxPoints: 5 },
  { number: 11, name: 'Pre-Contract HQS Inspections', description: 'Units pass HQS before HAP contract execution', maxPoints: 5 },
  { number: 12, name: 'Annual HQS Inspections', description: 'Inspections completed annually', maxPoints: 10 },
  { number: 13, name: 'Lease-Up Rate', description: 'Rate of voucher utilization / lease execution', maxPoints: 20 },
  { number: 14, name: 'Family Self-Sufficiency', description: 'FSS program enrollment and escrow', maxPoints: 10 },
];

export function useSEMAPIndicators(agencyId: string, reportingPeriod: string) {
  const [indicators, setIndicators] = useState<SEMAPIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agencyId || !reportingPeriod) return;
    const fetch = async () => {
      setLoading(true);

      // Fetch saved scores
      const { data: saved } = await supabase
        .from('agency_semap_scores')
        .select('indicator_number, score, notes')
        .eq('agency_id', agencyId)
        .eq('reporting_period', reportingPeriod);

      const savedMap: Record<number, { score: number; notes: string }> = {};
      (saved || []).forEach((s: any) => { savedMap[s.indicator_number] = { score: s.score, notes: s.notes || '' }; });

      // Auto-compute some indicators
      let autoScores: Record<number, number> = {};

      // Indicator 5 - HQS pass rate
      const { data: inspections } = await supabase
        .from('inspections')
        .select('result')
        .eq('agency_id', agencyId);
      if (inspections?.length) {
        const passed = inspections.filter((i: any) => i.result === 'pass').length;
        const rate = passed / inspections.length;
        autoScores[5] = rate >= 0.95 ? 5 : rate >= 0.8 ? 3 : 1;
      }

      // Indicator 13 - Lease-up rate
      const { data: vouchers } = await supabase
        .from('agency_vouchers')
        .select('status')
        .eq('agency_id', agencyId);
      if (vouchers?.length) {
        const leased = vouchers.filter((v: any) => v.status === 'leased_up').length;
        const rate = leased / vouchers.length;
        autoScores[13] = rate >= 0.95 ? 20 : rate >= 0.8 ? 15 : rate >= 0.5 ? 10 : 5;
      }

      // Indicator 9 - Timely recertifications
      const { data: recerts } = await supabase
        .from('agency_recertifications')
        .select('due_date, completed_at, status')
        .eq('agency_id', agencyId);
      if (recerts?.length) {
        const completed = recerts.filter((r: any) => r.status === 'completed' && r.completed_at);
        const onTime = completed.filter((r: any) => new Date(r.completed_at) <= new Date(r.due_date));
        const rate = completed.length > 0 ? onTime.length / completed.length : 0;
        autoScores[9] = rate >= 0.95 ? 10 : rate >= 0.8 ? 7 : rate >= 0.5 ? 4 : 1;
      }

      // Indicator 12 - Annual HQS inspections
      const { data: annualInspections } = await (supabase as any)
        .from('inspections')
        .select('scheduled_date, completed_date, inspection_type')
        .eq('agency_id', agencyId)
        .eq('inspection_type', 'annual');
      if (annualInspections?.length) {
        const completedOnTime = annualInspections.filter((i: any) => i.completed_date);
        const rate = completedOnTime.length / annualInspections.length;
        autoScores[12] = rate >= 0.95 ? 10 : rate >= 0.8 ? 7 : rate >= 0.5 ? 4 : 1;
      }

      // Indicator 14 - FSS enrollment
      const { data: fssParticipants } = await supabase
        .from('agency_fss_participants')
        .select('id, status')
        .eq('agency_id', agencyId)
        .in('status', ['enrolled', 'active', 'completed']);
      if (fssParticipants && vouchers?.length) {
        const fssRate = fssParticipants.length / vouchers.length;
        const hasEscrow = fssParticipants.length > 0;
        autoScores[14] = hasEscrow ? (fssRate >= 0.05 ? 10 : fssRate > 0 ? 5 : 0) : 0;
      }

      const result = SEMAP_DEFINITIONS.map(def => ({
        ...def,
        score: savedMap[def.number]?.score ?? autoScores[def.number] ?? 0,
        notes: savedMap[def.number]?.notes ?? '',
        autoComputed: def.number in autoScores && !(def.number in savedMap),
      }));

      setIndicators(result);
      setLoading(false);
    };
    fetch();
  }, [agencyId, reportingPeriod]);

  const updateIndicator = (number: number, updates: Partial<Pick<SEMAPIndicator, 'score' | 'notes'>>) => {
    setIndicators(prev => prev.map(i => i.number === number ? { ...i, ...updates, autoComputed: false } : i));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const ind of indicators) {
      await supabase.from('agency_semap_scores').upsert({
        agency_id: agencyId,
        reporting_period: reportingPeriod,
        indicator_number: ind.number,
        indicator_name: ind.name,
        max_points: ind.maxPoints,
        score: ind.score,
        notes: ind.notes,
      }, { onConflict: 'agency_id,reporting_period,indicator_number' });
    }
    setSaving(false);
  };

  const totalMax = indicators.reduce((s, i) => s + i.maxPoints, 0);
  const totalScore = indicators.reduce((s, i) => s + i.score, 0);
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passing = overallPct >= 60;

  return { indicators, loading, saving, updateIndicator, saveAll, totalMax, totalScore, overallPct, passing };
}
