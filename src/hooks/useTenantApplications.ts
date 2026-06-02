import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTenantApplications = (userId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tenant-applications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: applications, error } = await supabase
        .from('marketplace_applications')
        .select(`
          *,
          properties (
            id,
            address,
            street_address,
            city,
            state,
            zipcode,
            monthly_rent,
            desired_rent,
            bedrooms,
            bathrooms,
            photos,
            amenities
          ),
          property_units (
            id,
            unit_number,
            monthly_rent,
            bedrooms,
            bathrooms
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return applications || [];
    },
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-applications', userId] });
  };

  return {
    ...query,
    invalidate,
  };
};
