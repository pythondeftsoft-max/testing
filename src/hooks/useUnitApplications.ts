import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitApplication {
  id: string;
  tenant_id: string;
  unit_id: string;
  status: string;
  is_primary_applicant: boolean;
  created_at: string;
  tenant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    rent_range_min: number | null;
    rent_range_max: number | null;
    move_in_window: string | null;
    housing_status: string | null;
  };
}

export const useUnitApplications = (unitId: string | null) => {
  return useQuery({
    queryKey: ['unit-applications', unitId],
    queryFn: async () => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from('property_applications')
        .select(`
          id,
          tenant_id,
          unit_id,
          status,
          is_primary_applicant,
          created_at,
          tenant:profiles!property_applications_tenant_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            rent_range_min,
            rent_range_max,
            move_in_window,
            housing_status
          )
        `)
        .eq('unit_id', unitId)
        .neq('status', 'withdrawn')
        .order('is_primary_applicant', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(6);

      if (error) throw error;

      return (data || []) as unknown as UnitApplication[];
    },
    enabled: !!unitId,
  });
};
