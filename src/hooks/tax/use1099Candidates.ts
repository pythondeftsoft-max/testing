import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CandidateRow {
  recipient_id: string;
  form_type: '1099_nec' | '1099_misc';
  total: number;
}

export const use1099Candidates = (portfolioId?: string, year?: number) => {
  return useQuery({
    queryKey: ['1099-candidates', portfolioId, year],
    enabled: !!(portfolioId && year),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_1099_candidates', {
        p_portfolio: portfolioId,
        p_year: year,
      });
      if (error) throw error;
      return (data || []) as CandidateRow[];
    },
  });
};
