import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RENT_TRACKING_KEYS } from '@/lib/queryKeys';

interface PaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentType?: string; // 'all' | 'rent' | 'hap'
  propertyId?: string;
  unitId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const useAllIncomingPayments = (
  landlordId: string,
  portfolioId?: string,
  filters: PaymentFilters = {}
) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.payments(filters), 'all-incoming', 'landlord', landlordId, portfolioId],
    queryFn: async () => {
      console.log('useAllIncomingPayments - raw filters:', filters);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '' && value !== undefined)
      );
      console.log('useAllIncomingPayments - cleanFilters being sent:', cleanFilters, 'landlordId:', landlordId);
      
      const { data, error } = await supabase.functions.invoke('landlord-all-payments', {
        body: { filters: cleanFilters, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
    enabled: !!landlordId,
  });
};

export const useAllIncomingPaymentStats = (
  landlordId: string, 
  portfolioId?: string,
  filters: PaymentFilters = {}
) => {
  return useQuery({
    queryKey: [...RENT_TRACKING_KEYS.stats(), 'all-incoming', 'landlord', landlordId, portfolioId, filters],
    queryFn: async () => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== 'all' && value !== '' && value !== undefined)
      );
      
      const { data, error } = await supabase.functions.invoke('landlord-all-payments', {
        body: { statsOnly: true, filters: cleanFilters, landlordId, portfolioId },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
    enabled: !!landlordId,
  });
};
