
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useImportedProperties = () => {
  return useQuery({
    queryKey: ['importedPropertiesCount'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('import_source', 'csv_import')
        .eq('import_completed', false);

      if (error) throw error;
      return { count: data?.length || 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
