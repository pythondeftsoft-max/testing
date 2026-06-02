import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UtilityType = 'heating' | 'cooking' | 'electric' | 'water_sewer' | 'trash' | 'other';

export const UTILITY_TYPES: { value: UtilityType; label: string }[] = [
  { value: 'heating', label: 'Heating' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'electric', label: 'Electric' },
  { value: 'water_sewer', label: 'Water/Sewer' },
  { value: 'trash', label: 'Trash' },
  { value: 'other', label: 'Other' },
];

export interface UtilitySchedule {
  id: string;
  agency_id: string;
  bedroom_count: number;
  utility_type: UtilityType;
  monthly_allowance: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export function useUtilitySchedules(agencyId: string) {
  const [schedules, setSchedules] = useState<UtilitySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_utility_schedules')
      .select('*')
      .eq('agency_id', agencyId)
      .order('bedroom_count')
      .order('utility_type');

    if (error) {
      console.error('Failed to load utility schedules:', error);
    }
    setSchedules((data as unknown as UtilitySchedule[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const upsertSchedule = async (
    bedroomCount: number,
    utilityType: UtilityType,
    monthlyAllowance: number,
    effectiveDate: string
  ) => {
    const { error } = await supabase
      .from('agency_utility_schedules')
      .upsert({
        agency_id: agencyId,
        bedroom_count: bedroomCount,
        utility_type: utilityType,
        monthly_allowance: monthlyAllowance,
        effective_date: effectiveDate,
      }, {
        onConflict: 'agency_id,bedroom_count,utility_type,effective_date'
      });

    if (error) {
      toast.error('Failed to save utility schedule');
      return false;
    }
    await fetchSchedules();
    return true;
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('agency_utility_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete schedule');
      return false;
    }
    await fetchSchedules();
    return true;
  };

  const getTotalUA = (bedroomCount: number): number => {
    return schedules
      .filter(s => s.bedroom_count === bedroomCount)
      .reduce((sum, s) => sum + Number(s.monthly_allowance), 0);
  };

  return { schedules, loading, upsertSchedule, deleteSchedule, getTotalUA, refetch: fetchSchedules };
}
