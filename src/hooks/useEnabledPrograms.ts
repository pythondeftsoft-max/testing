import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { HousingProgramType } from '@/components/agency/ProgramFilter';

/**
 * Returns the list of housing program types this agency has enabled
 * in agency_programs. HCV is treated as a default-on program if no row exists.
 */
export const useEnabledPrograms = (agencyId: string | undefined) => {
  return useQuery({
    queryKey: ['enabled-programs', agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<HousingProgramType[]> => {
      if (!agencyId) return [];
      const { data } = await (supabase as any)
        .from('agency_programs')
        .select('program_type, is_enabled')
        .eq('agency_id', agencyId);

      const enabled = new Set<HousingProgramType>();
      let sawAny = false;
      (data || []).forEach((row: any) => {
        sawAny = true;
        if (row.is_enabled) enabled.add(row.program_type as HousingProgramType);
      });
      // Default HCV on for agencies with no config yet
      if (!sawAny) enabled.add('hcv');
      return Array.from(enabled);
    },
    staleTime: 60_000,
  });
};
