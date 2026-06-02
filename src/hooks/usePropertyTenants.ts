import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantInfo {
  property_id: string;
  tenant_id: string;
  unit_number?: string;
  unit_name?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function usePropertyTenants(propertyIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['property-tenants', propertyIds],
    queryFn: async (): Promise<TenantInfo[]> => {
      if (propertyIds.length === 0) return [];

      const { data, error } = await supabase
        .from('property_units')
        .select(`
          property_id,
          tenant_id,
          unit_number,
          unit_name,
          profiles!property_units_tenant_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'occupied')
        .in('property_id', propertyIds)
        .not('tenant_id', 'is', null);

      if (error) {
        console.error('Error fetching tenant info:', error);
        throw error;
      }

      return (data || []) as TenantInfo[];
    },
    enabled: enabled && propertyIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
