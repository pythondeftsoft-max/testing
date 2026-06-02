import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PushApplication {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  status: string;
  pushed_at: string;
  updated_at: string;
  expires_at: string;
  admin_id: string;
  // Joined data
  tenant?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
  tenant_profile?: {
    monthly_income: string | number | null;
    employment_status: string | null;
    credit_score_range: string | null;
    voucher_holder: boolean | null;
    voucher_status: string | null;
    voucher_amount: number | null;
    has_pets: boolean | null;
    pet_type: string | null;
    has_eviction: boolean | null;
    has_felonies: boolean | null;
    move_in_window: string | null;
  };
  property?: {
    id: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    monthly_rent: number;
    bedrooms: number;
    bathrooms: number;
    owner_id: string;
    portfolio_id: string;
  };
  unit?: {
    id: string;
    unit_number: string | null;
    monthly_rent: number;
    bedrooms: number;
    bathrooms: number;
  };
}

// Fetch all property_pushes with status='landlord_review' for landlord's properties
export const useLandlordPushApplications = (landlordId: string | undefined, portfolioId?: string) => {
  return useQuery({
    queryKey: ['landlord-push-applications', landlordId, portfolioId],
    queryFn: async () => {
      if (!landlordId) return [];

      // First get all properties owned by landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      if (portfolioId && portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      const { data: properties, error: propError } = await propertiesQuery;
      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map(p => p.id);

      // Get all units for these properties
      const { data: units, error: unitsError } = await supabase
        .from('property_units')
        .select('id, property_id')
        .in('property_id', propertyIds);
      
      if (unitsError) throw unitsError;

      const unitIds = (units || []).map(u => u.id);
      if (unitIds.length === 0) return [];

      // Get all pushes with status='landlord_review' for these units
      const { data: pushes, error: pushError } = await supabase
        .from('property_pushes')
        .select('*')
        .eq('status', 'landlord_review')
        .in('unit_id', unitIds)
        .gt('expires_at', new Date().toISOString())
        .order('pushed_at', { ascending: false });

      if (pushError) throw pushError;
      if (!pushes || pushes.length === 0) return [];

      // Get tenant profiles and property/unit details
      const tenantIds = [...new Set(pushes.map(p => p.tenant_id))];
      const pushUnitIds = [...new Set(pushes.map(p => p.unit_id))];

      const [profilesResult, tenantProfilesResult, unitsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .in('id', tenantIds),
        supabase
          .from('tenant_profiles')
          .select('user_id, monthly_income, employment_status, credit_score_range, voucher_holder, voucher_status, voucher_amount, has_pets, pet_type, has_eviction, has_felonies, move_in_window')
          .in('user_id', tenantIds),
        supabase
          .from('property_units')
          .select(`
            id, unit_number, monthly_rent, bedrooms, bathrooms,
            properties (id, address, city, state, zipcode, monthly_rent, bedrooms, bathrooms, owner_id, portfolio_id)
          `)
          .in('id', pushUnitIds)
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p]));
      const tenantProfilesMap = new Map((tenantProfilesResult.data || []).map(tp => [tp.user_id, tp]));
      const unitsMap = new Map((unitsResult.data || []).map(u => [u.id, u]));

      // Build enriched push applications
      return pushes.map(push => {
        const unit = unitsMap.get(push.unit_id);
        const property = unit?.properties;
        const profile = profilesMap.get(push.tenant_id);
        const tenantProfile = tenantProfilesMap.get(push.tenant_id);

        return {
          id: push.id,
          tenant_id: push.tenant_id,
          property_id: property?.id || push.property_id,
          unit_id: push.unit_id,
          status: push.status,
          pushed_at: push.pushed_at,
          updated_at: push.updated_at || push.pushed_at,
          expires_at: push.expires_at,
          admin_id: push.admin_id,
          tenant: profile || undefined,
          tenant_profile: tenantProfile || undefined,
          property: property || undefined,
          unit: unit ? { id: unit.id, unit_number: unit.unit_number, monthly_rent: unit.monthly_rent, bedrooms: unit.bedrooms, bathrooms: unit.bathrooms } : undefined,
        } as PushApplication;
      });
    },
    enabled: !!landlordId,
    refetchInterval: 30000,
  });
};

// Landlord denies a push - sets status to 'denied' and updates tenant view
export const useLandlordDenyPush = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pushId, reason }: { pushId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('property_pushes')
        .update({
          status: 'denied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pushId)
        .select()
        .single();

      if (error) throw error;
      
      console.log(`✅ Landlord denied push: ${pushId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-push-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-match-history'] });
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      
      toast.success('Application denied. The tenant has been notified.');
    },
    onError: (error: any) => {
      console.error('Deny push error:', error);
      toast.error(`Failed to deny: ${error.message}`);
    },
  });
};

// Landlord approves a push - sets as primary applicant
export const useLandlordApprovePush = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pushId, unitId, tenantId }: { pushId: string; unitId: string; tenantId: string }) => {
      // Update the push status
      const { error: pushError } = await supabase
        .from('property_pushes')
        .update({
          status: 'primary_applicant',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pushId);

      if (pushError) throw pushError;

      // Use the existing RPC to set primary applicant (handles unit status, etc.)
      const { data, error } = await supabase.rpc('landlord_set_primary_applicant', {
        p_unit_id: unitId,
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      
      console.log(`✅ Landlord approved push: ${pushId}, set primary for unit ${unitId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlord-push-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-match-history'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      
      window.dispatchEvent(new CustomEvent('primary-applicant-updated'));
      
      toast.success('Applicant approved as Primary! Listing is now paused.');
    },
    onError: (error: any) => {
      console.error('Approve push error:', error);
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
};
