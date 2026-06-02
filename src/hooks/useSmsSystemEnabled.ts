import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export const useSmsSystemEnabled = () => {
  const queryClient = useQueryClient();

  const { data: enabled = false, isLoading } = useQuery({
    queryKey: ['sms-system-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'sms_system_enabled')
        .single();

      if (error) {
        console.warn('Could not fetch sms_system_enabled config:', error);
        return false;
      }

      const val = data?.config_value;
      if (val === true || val === 'true') return true;
      return false;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const toggle = useCallback(async (newValue: boolean) => {
    const { error } = await supabase
      .from('system_config')
      .update({ config_value: newValue, updated_at: new Date().toISOString() })
      .eq('config_key', 'sms_system_enabled');

    if (error) throw error;
    queryClient.setQueryData(['sms-system-enabled'], newValue);
    queryClient.invalidateQueries({ queryKey: ['sms-system-enabled'] });
  }, [queryClient]);

  return { enabled, isLoading, toggle };
};
