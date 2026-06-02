import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantWorkload {
  id: string;
  full_name: string;
  email: string;
  housing_status: string;
  created_at: string;
  worker_assigned_at: string;
  max_budget: number | null;
  desired_bedrooms: number | null;
  applications_count: number;
  voucher_holder: boolean;
  city: string | null;
  zip_code: string | null;
  rent_range_min: number | null;
  rent_range_max: number | null;
  bedrooms_approved: string[] | null;
}


export const useWorkerWorkload = (workerId?: string) => {
  const tenants = useQuery({
    queryKey: ['worker-tenants', workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tenant_profiles!inner(
            voucher_holder,
            city,
            zip_code,
            rent_range_min,
            rent_range_max,
            bedrooms_approved
          )
        `)
        .eq('assigned_worker_id', workerId!)
        .in('housing_status', ['seeking', 'applied', 'approved'])
        .order('worker_assigned_at', { ascending: false });

      if (error) throw error;

      // Get application counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (profiles || []).map(async (tenant: any) => {
          const { count } = await supabase
            .from('property_applications')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            id: tenant.id,
            full_name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenant.email || 'Unknown',
            email: tenant.email,
            housing_status: tenant.housing_status,
            created_at: tenant.created_at,
            worker_assigned_at: tenant.worker_assigned_at,
            max_budget: tenant.max_budget,
            desired_bedrooms: tenant.desired_bedrooms,
            applications_count: count || 0,
            voucher_holder: (tenant as any).tenant_profiles?.voucher_holder || false,
            city: (tenant as any).tenant_profiles?.city || null,
            zip_code: (tenant as any).tenant_profiles?.zip_code || null,
            rent_range_min: (tenant as any).tenant_profiles?.rent_range_min || null,
            rent_range_max: (tenant as any).tenant_profiles?.rent_range_max || null,
            bedrooms_approved: (tenant as any).tenant_profiles?.bedrooms_approved || null,
          };
        })
      );

      return tenantsWithCounts as TenantWorkload[];
    },
  });

  return { tenants };
};
