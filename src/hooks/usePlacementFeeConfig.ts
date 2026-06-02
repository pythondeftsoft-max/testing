import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlacementFeeConfig {
  percentage: number;
  min_fee: number | null;
  max_fee: number | null;
  notes: string;
}

const PLACEMENT_FEE_CONFIG_KEY = ['placement-fee-config'];

export const usePlacementFeeConfig = () => {
  return useQuery({
    queryKey: PLACEMENT_FEE_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_configs')
        .select('*')
        .eq('config_key', 'placement_fee_config')
        .single();

      if (error) throw error;
      
      const configValue = data.config_value as unknown as PlacementFeeConfig;
      
      return {
        ...data,
        config_value: configValue,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdatePlacementFeeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: PlacementFeeConfig) => {
      const { data, error } = await supabase
        .from('platform_configs')
        .update({
          config_value: config as any,
        })
        .eq('config_key', 'placement_fee_config')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLACEMENT_FEE_CONFIG_KEY });
      queryClient.invalidateQueries({ queryKey: ['placement-fees-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      toast.success('Placement fee configuration updated successfully');
    },
    onError: (error) => {
      console.error('Error updating placement fee config:', error);
      toast.error('Failed to update placement fee configuration');
    },
  });
};
