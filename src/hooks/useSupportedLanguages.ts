import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  is_active: boolean;
  display_order: number;
}

export const useSupportedLanguages = () => {
  return useQuery({
    queryKey: ['supported-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supported_languages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as SupportedLanguage[];
    },
  });
};
