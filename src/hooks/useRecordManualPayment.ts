import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RENT_TRACKING_KEYS } from '@/lib/queryKeys';

interface MonthCovered {
  month: string;
  year: number;
}

export interface ManualPaymentData {
  landlordId: string;
  propertyId: string;
  tenantId: string;
  paymentType: 'tenant_rent' | 'hap_voucher';
  amount: number;
  paymentDate: string;
  paymentSource: string;
  monthsCovered: MonthCovered[];
  referenceNumber?: string;
  notes?: string;
}

export const useRecordManualPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: ManualPaymentData) => {
      const { data, error } = await supabase.functions.invoke('record-manual-payment', {
        body: paymentData,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      // Invalidate all payment-related queries
      queryClient.invalidateQueries({ queryKey: RENT_TRACKING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['all-incoming'] });
      queryClient.invalidateQueries({ queryKey: RENT_TRACKING_KEYS.stats() });
    },
  });
};
