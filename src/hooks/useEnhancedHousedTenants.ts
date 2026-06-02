
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedHousedTenant {
  id: string;
  tenant_id: string;
  property_id: string;
  status: string;
  created_at: string;
  tenant_profiles: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    user_type: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    user_type: string;
  } | null;
  unit_info: {
    id: string;
    unit_number: string;
    unit_name: string | null;
  } | null;
  rent_splits: {
    total_rent: number;
    pha_portion: number;
    tenant_portion: number;
  } | null;
  properties: {
    id: string;
    address: string;
    monthly_rent: number;
    bedrooms: number;
    bathrooms: number;
    owner_id: string;
    has_voucher: boolean;
    property_manager_id: string | null;
    management_company: string | null;
    landlord_response_time_avg: number;
    tenant_satisfaction_score: number;
    lease_start_date: string | null;
    lease_end_date: string | null;
  } | null;
  landlord_info: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    company_name: string | null;
  } | null;
  property_manager_info: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    company_name: string | null;
  } | null;
  portfolio_info: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  communications_summary: {
    total_messages: number;
    unread_messages: number;
    last_message_date: string | null;
    response_time_avg: number | null;
  };
  maintenance_summary: {
    open_requests: number;
    total_requests: number;
    avg_resolution_days: number | null;
    last_request_date: string | null;
  };
  housing_history: Array<{
    id: string;
    property_address: string;
    move_in_date: string;
    move_out_date: string | null;
    rent_amount: number;
    performance_score: number;
    lease_renewed: boolean;
  }>;
}

export const useEnhancedHousedTenants = () => {
  return useQuery({
    queryKey: ['enhanced-housed-tenants'],
    queryFn: async () => {
      console.log('Fetching enhanced housed tenants data...');

      // Get housed tenants from marketplace_applications
      const { data: applications, error: applicationsError } = await supabase
        .from('marketplace_applications')
        .select(`
          *,
          properties!marketplace_applications_property_id_fkey (
            id,
            address,
            monthly_rent,
            bedrooms,
            bathrooms,
            owner_id,
            portfolio_id,
            has_voucher,
            property_manager_id,
            management_company,
            landlord_response_time_avg,
            tenant_satisfaction_score,
            lease_start_date,
            lease_end_date
          ),
          profiles!marketplace_applications_user_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            email,
            user_type
          )
        `)
        .in('status', ['housed'])
        .eq('lifecycle_stage', 'current_tenant')
        .order('created_at', { ascending: false });

      if (applicationsError) {
        console.error('Error fetching applications:', applicationsError);
        throw applicationsError;
      }

      if (!applications || applications.length === 0) {
        console.log('No housed tenants found');
        return [];
      }

      // Get additional data for each tenant
      const enhancedTenants = await Promise.all(
        applications.map(async (app) => {
          const propertyId = app.property_id;
          const tenantId = app.user_id; // marketplace_applications uses user_id
          const ownerId = app.properties?.owner_id;
          const portfolioId = app.properties?.portfolio_id;
          const propertyManagerId = app.properties?.property_manager_id;

          // Get landlord info
          let landlordInfo = null;
          if (ownerId) {
            const { data: landlord } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, phone, company_name')
              .eq('id', ownerId)
              .single();
            landlordInfo = landlord;
          }

          // Get property manager info
          let propertyManagerInfo = null;
          if (propertyManagerId) {
            const { data: manager } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, phone, company_name')
              .eq('id', propertyManagerId)
              .single();
            propertyManagerInfo = manager;
          }

          // Get portfolio info
          let portfolioInfo = null;
          if (portfolioId) {
            const { data: portfolio } = await supabase
              .from('portfolios')
              .select('id, name, description')
              .eq('id', portfolioId)
              .single();
            portfolioInfo = portfolio;
          }

          // Get communications summary
          const { data: communications } = await supabase
            .from('tenant_communications')
            .select('*')
            .eq('property_id', propertyId)
            .eq('tenant_id', tenantId);

          const communicationsSummary = {
            total_messages: communications?.length || 0,
            unread_messages: communications?.filter(c => !c.read_at).length || 0,
            last_message_date: communications?.[0]?.sent_at || null,
            response_time_avg: app.properties?.landlord_response_time_avg || null
          };

          // Get maintenance summary
          const { data: maintenanceRequests } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('property_id', propertyId);

          const maintenanceSummary = {
            open_requests: maintenanceRequests?.filter(mr => mr.status !== 'completed').length || 0,
            total_requests: maintenanceRequests?.length || 0,
            avg_resolution_days: null, // Calculate if needed
            last_request_date: maintenanceRequests?.[0]?.created_at || null
          };

          // Get housing history
          const { data: housingHistory } = await supabase
            .from('tenant_housing_history')
            .select(`
              *,
              properties!tenant_housing_history_property_id_fkey (address)
            `)
            .eq('tenant_id', tenantId)
            .order('move_in_date', { ascending: false });

          const formattedHistory = housingHistory?.map(h => ({
            id: h.id,
            property_address: h.properties?.address || 'Unknown',
            move_in_date: h.move_in_date,
            move_out_date: h.move_out_date,
            rent_amount: h.rent_amount || 0,
            performance_score: h.performance_score || 5.0,
            lease_renewed: h.lease_renewed || false
          })) || [];

          // Get unit info if unit_id exists
          let unitInfo = null;
          if (app.unit_id) {
            const { data: unit } = await supabase
              .from('property_units')
              .select('id, unit_number, unit_name')
              .eq('id', app.unit_id)
              .single();
            unitInfo = unit;
          }

          // Get rent splits for this tenant/property
          let rentSplits = null;
          const { data: splits } = await supabase
            .from('rent_splits')
            .select('total_rent, pha_portion, tenant_portion')
            .eq('property_id', propertyId)
            .eq('is_active', true)
            .maybeSingle();
          
          if (splits) {
            rentSplits = {
              total_rent: splits.total_rent || 0,
              pha_portion: splits.pha_portion || 0,
              tenant_portion: splits.tenant_portion || 0
            };
          }

          return {
            ...app,
            tenant_id: app.user_id, // Map user_id to tenant_id for interface compatibility
            tenant_profiles: app.profiles, // Add this mapping to satisfy the interface
            unit_info: unitInfo,
            rent_splits: rentSplits,
            landlord_info: landlordInfo,
            property_manager_info: propertyManagerInfo,
            portfolio_info: portfolioInfo,
            communications_summary: communicationsSummary,
            maintenance_summary: maintenanceSummary,
            housing_history: formattedHistory
          } as EnhancedHousedTenant;
        })
      );

      console.log('Enhanced housed tenants data:', enhancedTenants);
      return enhancedTenants;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};
