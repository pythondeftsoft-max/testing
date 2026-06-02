import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsageMetrics {
  propertyCount?: number;
  applicationCount?: number;
  isLoading: boolean;
}

export const useSubscriptionUsageMetrics = (userId: string, role: string): UsageMetrics => {
  const { data: propertyCount, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['user-property-count', userId],
    queryFn: async () => {
      if (role !== 'landlord') return undefined;
      
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: role === 'landlord',
  });

  const { data: applicationCount, isLoading: isLoadingApplications } = useQuery({
    queryKey: ['user-application-count', userId],
    queryFn: async () => {
      if (role !== 'tenant') return undefined;
      
      const { count, error } = await supabase
        .from('property_applications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', userId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: role === 'tenant',
  });

  return {
    propertyCount,
    applicationCount,
    isLoading: isLoadingProperties || isLoadingApplications,
  };
};
