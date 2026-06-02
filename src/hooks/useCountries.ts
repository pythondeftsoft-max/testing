
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Country, AddressFormat } from '@/types/countries';
import { parseAddressFormat } from '@/lib/countryUtils';

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async (): Promise<Country[]> => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to ensure proper typing
      return (data || []).map(country => ({
        ...country,
        address_format: parseAddressFormat(country.address_format)
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 3, // Retry 3 times on failure
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000), // Exponential backoff
  });
};

export const useCountryAddressFormat = (countryCode: string) => {
  return useQuery({
    queryKey: ['country-address-format', countryCode],
    queryFn: async (): Promise<AddressFormat> => {
      if (!countryCode) {
        return parseAddressFormat(null);
      }

      const { data, error } = await supabase
        .rpc('get_country_address_format', { country_code: countryCode });

      if (error) {
        console.warn('Error fetching country address format:', error);
        return parseAddressFormat(null);
      }

      return parseAddressFormat(data);
    },
    enabled: !!countryCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
