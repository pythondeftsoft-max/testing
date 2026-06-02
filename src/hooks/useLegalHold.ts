import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns whether the given record has an active legal hold.
 * Use to disable delete/archive UI and explain why.
 */
export const useLegalHold = (recordType: string, recordId: string | null | undefined) => {
  return useQuery({
    queryKey: ['legal-hold', recordType, recordId],
    enabled: !!recordType && !!recordId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_legally_held', {
        _record_type: recordType,
        _record_id: recordId,
      });
      if (error) throw error;
      return data === true;
    },
    staleTime: 60_000,
  });
};
