import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RENT_TRACKING_KEYS } from '@/lib/queryKeys';

interface RentPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentSource?: string;
  landlordId?: string;
  propertyId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const useAdminRentPayments = (filters: RentPaymentFilters = {}) => {
  return useQuery({
    queryKey: RENT_TRACKING_KEYS.payments(filters),
    queryFn: async () => {
      // Remove "all" values from filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '')
      );
      
      const { data, error } = await supabase.functions.invoke('admin-rent-transactions', {
        body: { filters: cleanFilters },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
};

export const useRentPaymentStats = () => {
  return useQuery({
    queryKey: RENT_TRACKING_KEYS.stats(),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-rent-transactions', {
        body: { statsOnly: true },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
};
