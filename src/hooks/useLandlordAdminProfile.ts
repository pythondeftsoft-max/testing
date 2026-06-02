import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LandlordProperty {
  id: string;
  address: string;
  type: string;
  units: number;
  occupied_units: number;
  monthly_revenue: number;
  status: 'active' | 'partial' | 'inactive';
}

export interface LandlordTenant {
  id: string;
  name: string;
  property: string;
  lease_end: string | null;
  status: 'active' | 'ending_soon' | 'ended';
}

export interface LandlordMaintenanceRequest {
  id: string;
  property: string;
  issue: string;
  status: 'pending' | 'in_progress' | 'completed';
  date: string;
}

export interface LandlordFinancials {
  total_revenue: number;
  expenses: number;
  net_income: number;
  occupancy_rate: number;
}

export interface LandlordPortfolio {
  id: string;
  name: string;
  properties_count: number;
}

export const useLandlordAdminProfile = (userId: string) => {
  // Fetch portfolios
  const portfoliosQuery = useQuery({
    queryKey: ['admin-landlord-portfolios', userId],
    queryFn: async (): Promise<LandlordPortfolio[]> => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, client_name')
        .eq('manager_id', userId);

      if (error) throw error;

      // Get property counts for each portfolio
      const portfoliosWithCounts = await Promise.all(
        (data || []).map(async (portfolio) => {
          const { count } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('portfolio_id', portfolio.id);

          return {
            id: portfolio.id,
            name: portfolio.client_name,
            properties_count: count || 0,
          };
        })
      );

      return portfoliosWithCounts;
    },
    enabled: !!userId,
  });

  // Fetch properties
  const propertiesQuery = useQuery({
    queryKey: ['admin-landlord-properties', userId],
    queryFn: async (): Promise<LandlordProperty[]> => {
      // Query properties directly by owner_id
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          property_type,
          monthly_rent,
          property_units (id, status)
        `)
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (propertiesError) throw propertiesError;

      return (properties || []).map((property: any) => {
        const units = property.property_units || [];
        const totalUnits = units.length || 1;
        const occupiedUnits = units.filter((u: any) => u.status === 'occupied').length;

        return {
          id: property.id,
          address: `${property.address || property.property_name}, ${property.city || ''}, ${property.state || ''}`.trim().replace(/,\s*,/g, ',').replace(/,\s*$/, ''),
          type: property.property_type || 'Unknown',
          units: totalUnits,
          occupied_units: occupiedUnits,
          monthly_revenue: property.monthly_rent || 0,
          status: occupiedUnits === totalUnits ? 'active' : occupiedUnits > 0 ? 'partial' : 'inactive',
        };
      });
    },
    enabled: !!userId,
  });

  // Fetch tenants (via property units with tenants)
  const tenantsQuery = useQuery({
    queryKey: ['admin-landlord-tenants', userId],
    queryFn: async (): Promise<LandlordTenant[]> => {
      // Get properties directly by owner_id
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, property_name, address')
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (propertiesError) throw propertiesError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map((p) => p.id);
      const propertyMap = new Map(properties.map((p) => [p.id, p.property_name || p.address]));

      // Get property units with tenants
      const { data: units, error: unitsError } = await supabase
        .from('property_units')
        .select(`
          id,
          property_id,
          lease_end_date,
          status,
          current_tenant_id,
          profiles:current_tenant_id (first_name, last_name)
        `)
        .in('property_id', propertyIds)
        .not('current_tenant_id', 'is', null);

      if (unitsError) throw unitsError;

      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      return (units || []).map((unit: any) => {
        const endDate = unit.lease_end_date ? new Date(unit.lease_end_date) : null;
        let status: 'active' | 'ending_soon' | 'ended' = 'active';
        
        if (endDate) {
          if (endDate < now) status = 'ended';
          else if (endDate < threeMonthsFromNow) status = 'ending_soon';
        }

        const profile = unit.profiles;
        const tenantName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Tenant'
          : 'Unknown Tenant';

        return {
          id: unit.id,
          name: tenantName,
          property: propertyMap.get(unit.property_id) || 'Unknown Property',
          lease_end: unit.lease_end_date,
          status,
        };
      });
    },
    enabled: !!userId,
  });

  // Fetch maintenance requests
  const maintenanceQuery = useQuery({
    queryKey: ['admin-landlord-maintenance', userId],
    queryFn: async (): Promise<LandlordMaintenanceRequest[]> => {
      // Get properties directly by owner_id
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, property_name, address')
        .eq('owner_id', userId)
        .is('deleted_at', null);

      if (propertiesError) throw propertiesError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map((p) => p.id);
      const propertyMap = new Map(properties.map((p) => [p.id, p.property_name || p.address]));

      // Get maintenance requests
      const { data: requests, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('id, property_id, description, title, status, created_at')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (requestsError) throw requestsError;

      return (requests || []).map((req) => ({
        id: req.id,
        property: propertyMap.get(req.property_id) || 'Unknown Property',
        issue: req.title || req.description || 'Maintenance Request',
        status: req.status === 'completed' ? 'completed' : req.status === 'in_progress' ? 'in_progress' : 'pending',
        date: req.created_at,
      }));
    },
    enabled: !!userId,
  });

  // Calculate financials
  const properties = propertiesQuery.data || [];
  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
  const occupiedUnits = properties.reduce((sum, p) => sum + p.occupied_units, 0);
  const totalRevenue = properties.reduce((sum, p) => sum + p.monthly_revenue, 0);
  
  const financials: LandlordFinancials = {
    total_revenue: totalRevenue,
    expenses: 0, // Would need expense tracking table
    net_income: totalRevenue,
    occupancy_rate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
  };

  return {
    portfolios: portfoliosQuery.data || [],
    properties: propertiesQuery.data || [],
    tenants: tenantsQuery.data || [],
    maintenance: maintenanceQuery.data || [],
    financials,
    isLoading: portfoliosQuery.isLoading || propertiesQuery.isLoading || tenantsQuery.isLoading || maintenanceQuery.isLoading,
    error: portfoliosQuery.error || propertiesQuery.error || tenantsQuery.error || maintenanceQuery.error,
  };
};
