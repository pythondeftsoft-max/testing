import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'tenant' | 'property';

export const useEnhancedUnassignedQueue = (
  entityType: EntityType
) => {
  return useQuery({
    queryKey: ['enhanced-unassigned-queue', entityType],
    queryFn: async () => {
      if (entityType === 'tenant') {
        // Get tenant profiles with their related profile info
        let query = supabase
          .from('tenant_profiles')
          .select(`
            id,
            user_id,
            voucher_holder,
            voucher_status,
            voucher_amount,
            monthly_income,
            max_rent,
            rent_range_min,
            rent_range_max,
            bedrooms_approved,
            credit_score,
            credit_score_range,
            employment_status,
            preferred_locations,
            city,
            state,
            country_code,
            zip_code,
            has_eviction,
            eviction_details,
            has_felonies,
            felony_details,
            has_pets,
            pet_type,
            move_in_window,
            created_at,
            profiles!tenant_profiles_user_id_fkey (
              first_name,
              last_name,
              phone,
              email,
              assigned_worker_id,
              housing_status,
              territory_id,
              pipeline_stage
            )
          `)
          .is('profiles.assigned_worker_id', null);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform and filter the data
        let tenants = data
          ?.filter(tenant => tenant.profiles !== null)
          ?.map(tenant => {
          const profile = tenant.profiles as any;
          return {
            id: tenant.id,
            user_id: tenant.user_id,
            full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
            phone: profile?.phone || 'N/A',
            email: profile?.email || 'N/A',
            voucher_holder: tenant.voucher_holder || false,
            voucher_status: tenant.voucher_status || null,
            voucher_amount: tenant.voucher_amount || 0,
            monthly_income: tenant.monthly_income || '0',
            max_rent: tenant.max_rent || 0,
            rent_range_min: tenant.rent_range_min || 0,
            rent_range_max: tenant.rent_range_max || 0,
            bedrooms_approved: tenant.bedrooms_approved || [],
            credit_score: tenant.credit_score || null,
            credit_score_range: tenant.credit_score_range || null,
            employment_status: tenant.employment_status || 'N/A',
            preferred_locations: tenant.preferred_locations || [],
            city: tenant.city || 'N/A',
            state: tenant.state || null,
            country_code: tenant.country_code || 'US',
            zip_code: tenant.zip_code || 'N/A',
            has_eviction: tenant.has_eviction || false,
            eviction_details: tenant.eviction_details || null,
            has_felonies: tenant.has_felonies || false,
            felony_details: tenant.felony_details || null,
            has_pets: tenant.has_pets || false,
            pet_type: tenant.pet_type || null,
            move_in_window: tenant.move_in_window || null,
            assigned_worker_id: profile?.assigned_worker_id,
            housing_status: profile?.housing_status,
            territory_id: profile?.territory_id || null,
            pipeline_stage: profile?.pipeline_stage || profile?.housing_status || null,
            created_at: tenant.created_at,
          };
        }) || [];
        
        return tenants;
      } else {
        // Property logic
        let query = supabase
          .from('properties')
          .select(`
            id,
            address,
            city,
            state,
            zip_code,
            monthly_rent,
            bedrooms,
            bathrooms,
            status,
            assigned_worker_id,
            territory_id,
            created_at
          `)
          .is('assigned_worker_id', null);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};
