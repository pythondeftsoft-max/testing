import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAgencyMapDetail = (agencyId: string | null) => {
  const tenants = useQuery({
    queryKey: ['agency-map-tenants', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('user_id, voucher_status, platform_voucher_status, housing_authority, city, state, agency_id')
        .eq('agency_id', agencyId!)
        .limit(500);
      if (error) throw error;

      // Fetch profile names for these tenants
      if (data && data.length > 0) {
        const userIds = data.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        return data.map(t => ({ ...t, profile: profileMap.get(t.user_id) || null }));
      }
      return data || [];
    }
  });

  const vouchers = useQuery({
    queryKey: ['agency-map-vouchers', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_vouchers')
        .select('id, voucher_number, voucher_type, status, lifecycle_status, amount, issued_at, expires_at, tenant_id')
        .eq('agency_id', agencyId!)
        .limit(500);
      if (error) throw error;
      return data || [];
    }
  });

  const staff = useQuery({
    queryKey: ['agency-map-staff', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_staff')
        .select('id, user_id, role, is_active, created_at')
        .eq('agency_id', agencyId!)
        .limit(100);
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        return data.map(s => ({ ...s, profile: profileMap.get(s.user_id) || null }));
      }
      return data || [];
    }
  });

  const hapContracts = useQuery({
    queryKey: ['agency-map-hap', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_hap_contracts')
        .select('id, contract_number, status, hap_amount, tenant_rent, gross_rent, property_address, effective_date, expiration_date')
        .eq('agency_id', agencyId!)
        .limit(500);
      if (error) throw error;
      return data || [];
    }
  });

  const landlords = useQuery({
    queryKey: ['agency-map-landlords', agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_landlords')
        .select('id, landlord_name, landlord_email, onboarding_status, properties_count, payment_method, w9_status')
        .eq('agency_id', agencyId!)
        .limit(200);
      if (error) throw error;
      return data || [];
    }
  });

  return { tenants, vouchers, staff, hapContracts, landlords };
};
