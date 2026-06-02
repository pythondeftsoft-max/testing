import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RENT_TRACKING_KEYS } from '@/lib/queryKeys';

interface HAPPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  propertyId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const useLandlordHAPPayments = (
  landlordId: string,
  portfolioId?: string,
  filters: HAPPaymentFilters = {}
) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.hapPayments(filters), 'landlord', landlordId, portfolioId],
    queryFn: async () => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '')
      );
      
      const { data, error } = await supabase.functions.invoke('landlord-hap-transactions', {
        body: { filters: cleanFilters, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
    enabled: !!landlordId,
  });
};

export const useLandlordHAPPaymentStats = (landlordId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.hapPayments({}), 'stats', 'landlord', landlordId, portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-hap-transactions', {
        body: { statsOnly: true, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
    enabled: !!landlordId,
  });
};
