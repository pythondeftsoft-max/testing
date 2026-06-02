import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveApplication {
  id: string;
  user_id: string;
  property_id: string;
  unit_id: string | null;
  status: string;
  priority_payment_made: boolean;
  created_at: string;
  assigned_worker_id: string | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  property: {
    street_address: string;
    city: string;
    state: string;
    zipcode: string;
  };
  unit: {
    unit_number: string;
    monthly_rent: number;
  } | null;
}

interface UseActiveApplicationsOptions {
  statusFilter?: string;
}

export const useActiveApplications = (options?: UseActiveApplicationsOptions) => {
  return useQuery({
    queryKey: ['marketplace-applications', 'active', options?.statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_applications')
        .select(`
          id,
          user_id,
          property_id,
          unit_id,
          status,
          priority_payment_made,
          created_at,
          assigned_worker_id,
          user:profiles!marketplace_applications_user_id_fkey!inner(
            first_name,
            last_name,
            email
          ),
          property:properties(
            street_address,
            city,
            state,
            zipcode,
            monthly_rent,
            bedrooms,
            bathrooms
          ),
          unit:property_units(
            unit_number,
            monthly_rent
          )
        `)
        .in('status', ['submitted'])
        .order('created_at', { ascending: false });

      if (options?.statusFilter && options.statusFilter !== 'all') {
        query = query.eq('status', options.statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as unknown as ActiveApplication[];
    },
  });
};
