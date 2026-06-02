import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnhousedTenant {
  id: string;
  first_name?: string;
  last_name?: string;
  housing_preferences?: {
    min_rent?: number;
    max_rent?: number;
    preferred_location?: string;
    bedrooms?: number;
  };
  created_at: string;
}

export const useUnhousedTenants = () => {
  return useQuery({
    queryKey: ['unhoused-tenants'],
    queryFn: async () => {
      // Get tenant profiles who are actively seeking housing
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          created_at
        `)
        .eq('user_type', 'tenant');

      if (error) throw error;
      
      // Transform the data to include mock housing preferences for now
      return (data || []).map(profile => ({
        ...profile,
        housing_preferences: {
          min_rent: 500,
          max_rent: 2000,
          preferred_location: 'Any',
          bedrooms: 1
        }
      })) as UnhousedTenant[];
    },
  });
};