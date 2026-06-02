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

export const useAdminHAPPayments = (filters: HAPPaymentFilters = {}) => {
  return useQuery({
    queryKey: RENT_TRACKING_KEYS.hapPayments(filters),
    queryFn: async () => {
      // Remove "all" values from filters
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '')
      );
      
      const { data, error } = await supabase.functions.invoke('admin-hap-transactions', {
        body: { filters: cleanFilters },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
};

export const useHAPPaymentStats = () => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.hapPayments({}), 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-hap-transactions', {
        body: { statsOnly: true },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
};
