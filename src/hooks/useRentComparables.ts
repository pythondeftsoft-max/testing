import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RentComparable {
  id: string;
  agency_id: string;
  rfta_id: string | null;
  address: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number | null;
  monthly_rent: number;
  amenities: string | null;
  unit_condition: string | null;
  date_surveyed: string;
  surveyed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface RentReasonablenessAnalysis {
  id: string;
  agency_id: string;
  rfta_id: string;
  proposed_rent: number;
  comparable_avg: number | null;
  comparable_median: number | null;
  comparable_count: number;
  determination: 'pass' | 'fail' | 'pending';
  analyst_notes: string | null;
  analyzed_by: string | null;
  created_at: string;
}

export function useRentComparables(agencyId: string, rftaId?: string) {
  const [comparables, setComparables] = useState<RentComparable[]>([]);
  const [analysis, setAnalysis] = useState<RentReasonablenessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComparables = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('rent_comparables')
      .select('*')
      .eq('agency_id', agencyId)
      .order('date_surveyed', { ascending: false });

    if (rftaId) {
      query = query.eq('rfta_id', rftaId);
    }

    const { data, error } = await query;
    if (error) console.error('Failed to load comparables:', error);
    setComparables((data as unknown as RentComparable[]) || []);

    if (rftaId) {
      const { data: analysisData } = await supabase
        .from('rent_reasonableness_analyses')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('rfta_id', rftaId)
        .maybeSingle();
      setAnalysis(analysisData as unknown as RentReasonablenessAnalysis | null);
    }

    setLoading(false);
  }, [agencyId, rftaId]);

  useEffect(() => { fetchComparables(); }, [fetchComparables]);

  const addComparable = async (comparable: Omit<RentComparable, 'id' | 'created_at' | 'agency_id'>) => {
    const { error } = await supabase
      .from('rent_comparables')
      .insert({ ...comparable, agency_id: agencyId });

    if (error) { toast.error('Failed to add comparable'); return false; }
    toast.success('Comparable added');
    await fetchComparables();
    return true;
  };

  const deleteComparable = async (id: string) => {
    const { error } = await supabase.from('rent_comparables').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return false; }
    await fetchComparables();
    return true;
  };

  const runAnalysis = async (rftaId: string, proposedRent: number, staffId: string) => {
    const rftaComps = comparables.filter(c => c.rfta_id === rftaId);
    if (rftaComps.length === 0) {
      toast.error('Add at least one comparable first');
      return false;
    }

    const rents = rftaComps.map(c => Number(c.monthly_rent)).sort((a, b) => a - b);
    const avg = rents.reduce((s, r) => s + r, 0) / rents.length;
    const median = rents.length % 2 === 0
      ? (rents[rents.length / 2 - 1] + rents[rents.length / 2]) / 2
      : rents[Math.floor(rents.length / 2)];

    // Pass if proposed rent <= avg of comparables
    const determination = proposedRent <= avg ? 'pass' : 'fail';

    const { error } = await supabase
      .from('rent_reasonableness_analyses')
      .upsert({
        agency_id: agencyId,
        rfta_id: rftaId,
        proposed_rent: proposedRent,
        comparable_avg: Math.round(avg * 100) / 100,
        comparable_median: Math.round(median * 100) / 100,
        comparable_count: rftaComps.length,
        determination,
        analyzed_by: staffId,
      }, { onConflict: 'agency_id,rfta_id' });

    if (error) { toast.error('Failed to save analysis'); return false; }
    toast.success(`Rent reasonableness: ${determination.toUpperCase()}`);
    await fetchComparables();
    return true;
  };

  return { comparables, analysis, loading, addComparable, deleteComparable, runAnalysis, refetch: fetchComparables };
}
