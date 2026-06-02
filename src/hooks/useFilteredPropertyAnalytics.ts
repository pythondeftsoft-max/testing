import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Property {
  id: string;
  address: string;
  monthly_rent?: number;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at: string;
  portfolio_id?: string;
  owner_id: string;
  square_feet?: number;
  has_voucher?: boolean;
  property_units?: Array<{
    id: string;
    unit_number?: string;
    monthly_rent?: number;
    status?: string;
    square_feet?: number;
  }>;
}

interface FilteredPropertyAnalytics {
  totalProperties: number;
  totalUnits?: number; // Add optional totalUnits property
  totalRevenue: number;
  averageRent: number;
  occupancyRate: number;
  vacantProperties: number;
  occupiedProperties: number;
  maintenanceProperties: number;
  avgDaysOnMarket: number;
  totalSquareFeet: number;
  revenuePerSqFt: number;
  properties: Property[];
}

export const useFilteredPropertyAnalytics = (
  userId: string,
  portfolioId: string,
  filteredPropertyIds?: string[],
  selectedTenantTypes?: string[]
) => {
  return useQuery({
    queryKey: ['filtered-property-analytics', userId, portfolioId, filteredPropertyIds, selectedTenantTypes],
    queryFn: async (): Promise<FilteredPropertyAnalytics> => {
      if (!userId) {
        return {
          totalProperties: 0,
          totalUnits: 0,
          totalRevenue: 0,
          averageRent: 0,
          occupancyRate: 0,
          vacantProperties: 0,
          occupiedProperties: 0,
          maintenanceProperties: 0,
          avgDaysOnMarket: 0,
          totalSquareFeet: 0,
          revenuePerSqFt: 0,
          properties: [],
        };
      }

      try {
        let query = supabase
          .from('properties')
          .select(`
            id,
            address,
            monthly_rent,
            status,
            bedrooms,
            bathrooms,
            property_type,
            lease_start_date,
            lease_end_date,
            created_at,
            portfolio_id,
            owner_id,
            square_feet,
            has_voucher,
            property_units (
              id,
              unit_number,
              monthly_rent,
              status,
              square_feet
            )
          `)
          .eq('owner_id', userId)
          .is('deleted_at', null)
          .order('address');

        // Filter by portfolio if not "everything" or "all"
        if (portfolioId && portfolioId !== 'everything' && portfolioId !== 'all') {
          query = query.eq('portfolio_id', portfolioId);
        }

        // Filter by specific properties if provided
        if (filteredPropertyIds && filteredPropertyIds.length > 0) {
          query = query.in('id', filteredPropertyIds);
        }

        const { data: properties, error } = await query;

        if (error) {
          console.error('Error fetching filtered properties:', error);
          throw error;
        }

        if (!properties) {
          return {
            totalProperties: 0,
            totalUnits: 0,
            totalRevenue: 0,
            averageRent: 0,
            occupancyRate: 0,
            vacantProperties: 0,
            occupiedProperties: 0,
            maintenanceProperties: 0,
            avgDaysOnMarket: 0,
            totalSquareFeet: 0,
            revenuePerSqFt: 0,
            properties: [],
          };
        }

        // Apply tenant type filtering
        let filteredProperties = properties;
        if (selectedTenantTypes && selectedTenantTypes.length > 0) {
          filteredProperties = properties.filter(property => {
            return selectedTenantTypes.some(tenantType => {
              switch (tenantType) {
                case 'market_rate':
                  return property.has_voucher === false && property.status === 'occupied';
                case 'section_8':
                  return property.has_voucher === true && property.status === 'occupied';
                case 'vacant':
                  return property.status === 'available' || property.status === 'vacant';
                case 'occupied':
                  return property.status === 'occupied';
                default:
                  return true;
              }
            });
          });
        }

        // Calculate analytics using filtered properties
        const totalProperties = filteredProperties.length;
        
        // Count total units (including individual units from multi-unit properties)
        const totalUnits = filteredProperties.reduce((count, property) => {
          const units = property.property_units || [];
          return count + (units.length > 0 ? units.length : 1);
        }, 0);
        
        const totalRevenue = filteredProperties.reduce((sum, p) => sum + ((p.monthly_rent || 0) * 12), 0); // Annual revenue
        const averageRent = totalProperties > 0 ? filteredProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) / totalProperties : 0;
        
        const occupiedProperties = filteredProperties.filter(p => 
          p.status === 'occupied'
        ).length;
        const vacantProperties = filteredProperties.filter(p => 
          p.status === 'available'
        ).length;
        // Note: 'maintenance' status doesn't exist in database, using vacant for other statuses
        const maintenanceProperties = filteredProperties.filter(p => 
          p.status && !['occupied', 'available'].includes(p.status)
        ).length;
        
        const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
        
        // Calculate average days on market for vacant properties
        const vacantProps = filteredProperties.filter(p => p.status === 'available');
        const avgDaysOnMarket = vacantProps.length > 0 
          ? vacantProps.reduce((sum, p) => {
              const daysListed = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
              return sum + daysListed;
            }, 0) / vacantProps.length 
          : 0;

        const totalSquareFeet = filteredProperties.reduce((sum, p) => sum + (p.square_feet || 0), 0);
        const revenuePerSqFt = totalSquareFeet > 0 ? totalRevenue / totalSquareFeet : 0;

        return {
          totalProperties,
          totalUnits,
          totalRevenue,
          averageRent,
          occupancyRate,
          vacantProperties,
          occupiedProperties,
          maintenanceProperties,
          avgDaysOnMarket,
          totalSquareFeet,
          revenuePerSqFt,
          properties: filteredProperties as Property[],
        };
      } catch (error) {
        console.error('Error in useFilteredPropertyAnalytics:', error);
        // Return default values instead of throwing to prevent dashboard crashes
        return {
          totalProperties: 0,
          totalUnits: 0,
          totalRevenue: 0,
          averageRent: 0,
          occupancyRate: 0,
          vacantProperties: 0,
          occupiedProperties: 0,
          maintenanceProperties: 0,
          avgDaysOnMarket: 0,
          totalSquareFeet: 0,
          revenuePerSqFt: 0,
          properties: [],
        };
      }
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};