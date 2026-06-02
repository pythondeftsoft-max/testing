import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RENT_TRACKING_KEYS } from '@/lib/queryKeys';

interface RentPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentSource?: string;
  propertyId?: string;
  unitId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const useLandlordRentPayments = (
  landlordId: string,
  portfolioId?: string,
  filters: RentPaymentFilters = {}
) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.payments(filters), 'landlord', landlordId, portfolioId],
    queryFn: async () => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '')
      );
      
      const { data, error } = await supabase.functions.invoke('landlord-rent-transactions', {
        body: { filters: cleanFilters, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
    enabled: !!landlordId,
  });
};

export const useLandlordRentPaymentStats = (landlordId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.stats(), 'landlord', landlordId, portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('landlord-rent-transactions', {
        body: { statsOnly: true, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
    enabled: !!landlordId,
  });
};
