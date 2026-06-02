import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentMethodFees {
  stripe_processing_fee: number;
  platform_revenue_fee: number;
  tenant_pays_percent: number;
  landlord_pays_percent: number;
}

export interface FeeRates {
  [key: string]: PaymentMethodFees;
}

const PLATFORM_CONFIG_KEY = ['platform-config', 'fee_rates'];

export const usePlatformConfig = () => {
  return useQuery({
    queryKey: PLATFORM_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_configs')
        .select('*')
        .eq('config_key', 'fee_rates')
        .single();

      if (error) throw error;
      
      // Parse the JSON config_value
      const configValue = data.config_value as unknown as FeeRates;
      
      return {
        ...data,
        config_value: configValue,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdatePlatformConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeRates: any) => {
      const { data, error } = await supabase
        .from('platform_configs')
        .update({
          config_value: feeRates,
        })
        .eq('config_key', 'fee_rates')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_CONFIG_KEY });
      queryClient.invalidateQueries({ queryKey: ['rent-tracking'] });
      toast.success('Fee rates updated successfully');
    },
    onError: (error) => {
      console.error('Error updating platform config:', error);
      toast.error('Failed to update fee rates');
    },
  });
};
