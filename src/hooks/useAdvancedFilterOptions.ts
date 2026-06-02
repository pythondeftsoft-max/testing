import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPortfolios } from './useUserPortfolios';
import { normalizePortfolioId } from '@/utils/portfolio';

interface PropertyFilters {
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedProperties: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface FinancialPropertyFilters extends PropertyFilters {
  selectedTenantTypes: string[];
}

interface AdvancedFilterOptions {
  portfolioOptions: { value: string; label: string }[];
  propertyTypeOptions: { value: string; label: string }[];
  propertyOptions: { value: string; label: string }[];
  tenantTypeOptions: { value: string; label: string }[];
}

export const useAdvancedFilterOptions = (
  userId: string, 
  rawPortfolioId?: string, 
  currentFilters?: PropertyFilters | FinancialPropertyFilters
) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const { portfolios: userPortfolios, loading: portfoliosLoading } = useUserPortfolios(userId);

  return useQuery({
    queryKey: ['advanced-filter-options', userId, portfolioId, currentFilters, userPortfolios?.length],
    queryFn: async (): Promise<AdvancedFilterOptions> => {
      if (!userId) {
        return {
          portfolioOptions: [],
          propertyTypeOptions: [],
          propertyOptions: [],
          tenantTypeOptions: [],
        };
      }

      try {
        // Base query for all user properties with portfolios
        let baseQuery = supabase
          .from('properties')
          .select(`
            id,
            address,
            property_type,
            portfolio_id,
            has_voucher,
            portfolios!inner(id, client_name)
          `)
          .eq('owner_id', userId)
          .is('deleted_at', null);

        // Apply portfolio filter if viewing specific portfolio
        if (portfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId)) {
          baseQuery = baseQuery.eq('portfolio_id', portfolioId);
        }

        const { data: allProperties, error } = await baseQuery;

        if (error) {
          console.error('Error fetching properties for filtering:', error);
          throw error;
        }

        // Start with all properties, then apply cascading filters
        let availableProperties = allProperties || [];

        // Apply current filter constraints to determine available options
        if (currentFilters) {
          // If portfolios are selected, only show properties in those portfolios
          if (currentFilters.selectedPortfolios.length > 0) {
            availableProperties = availableProperties.filter(p => 
              currentFilters.selectedPortfolios.includes(p.portfolio_id || '')
            );
          }

          // If property types are selected, only show properties of those types
          if (currentFilters.selectedPropertyTypes.length > 0) {
            availableProperties = availableProperties.filter(p =>
              currentFilters.selectedPropertyTypes.includes(p.property_type || '')
            );
          }

          // If specific properties are selected, use them to constrain other filters
          if (currentFilters.selectedProperties.length > 0) {
            const selectedProperties = availableProperties.filter(p =>
              currentFilters.selectedProperties.includes(p.id)
            );
            
            // If we have selected properties, derive constraints from them
            if (selectedProperties.length > 0) {
              availableProperties = selectedProperties;
            }
          }
        }

        // Generate portfolio options from userPortfolios (includes all accessible portfolios)
        const portfolioOptions = userPortfolios?.map(portfolio => ({
          value: portfolio.id,
          label: portfolio.client_name
        })) || [];

        // Generate comprehensive property type options (all possible types)
        const allPropertyTypes = [
          // Residential types
          { value: 'house', label: 'House' },
          { value: 'apartment', label: 'Apartment' },
          { value: 'townhouse', label: 'Townhouse' },
          { value: 'duplex', label: 'Duplex' },
          { value: 'triplex', label: 'Triplex' },
          { value: 'fourplex', label: 'Fourplex' },
          { value: 'mobile_home', label: 'Mobile Home' },
          { value: 'manufactured_home', label: 'Manufactured Home' },
          
          // Commercial main types
          { value: 'commercial', label: 'Commercial' },
          { value: 'office', label: 'Office' },
          { value: 'retail', label: 'Retail' },
          { value: 'warehouse', label: 'Warehouse' },
          { value: 'industrial', label: 'Industrial' },
          { value: 'hospitality', label: 'Hospitality' },
          { value: 'specialty', label: 'Specialty' },
          { value: 'mixed_use', label: 'Mixed Use' },
          
          // Commercial subtypes
          { value: 'office_building', label: 'Office Building' },
          { value: 'warehouse_distribution', label: 'Warehouse Distribution' },
          { value: 'shopping_center', label: 'Shopping Center' },
          { value: 'manufacturing', label: 'Manufacturing' },
          { value: 'flex_space', label: 'Flex Space' },
          { value: 'hotel', label: 'Hotel' },
          { value: 'motel', label: 'Motel' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'medical', label: 'Medical' },
          { value: 'marina', label: 'Marina' },
          { value: 'self_storage', label: 'Self Storage' },
          { value: 'golf_course', label: 'Golf Course' },
          { value: 'prison', label: 'Prison' }
        ];

        // Get unique property types that actually exist in available properties
        const existingTypes = new Set(availableProperties.map(p => p.property_type).filter(Boolean) as string[]);
        const propertyTypeOptions = allPropertyTypes.filter(type => existingTypes.has(type.value));

        // Generate property options based on available properties
        const propertyOptions = availableProperties.map(property => ({
          value: property.id,
          label: property.address || `Property ${property.id}`
        }));

        // Generate tenant type options
        const tenantTypeOptions = [
          { value: 'market_rate', label: 'Market Rate' },
          { value: 'section_8', label: 'Section 8/Voucher Holders' },
          { value: 'vacant', label: 'Vacant' },
          { value: 'occupied', label: 'All Occupied' }
        ];

        console.log('🔍 [useAdvancedFilterOptions] Generated options:', {
          portfolioOptionsCount: portfolioOptions.length,
          propertyTypeOptionsCount: propertyTypeOptions.length,
          propertyOptionsCount: propertyOptions.length,
          tenantTypeOptionsCount: tenantTypeOptions.length,
          currentFilters,
          availablePropertiesCount: availableProperties.length
        });

        return {
          portfolioOptions,
          propertyTypeOptions,
          propertyOptions,
          tenantTypeOptions,
        };
      } catch (error) {
        console.error('Error in useAdvancedFilterOptions:', error);
        return {
          portfolioOptions: [],
          propertyTypeOptions: [],
          propertyOptions: [],
          tenantTypeOptions: [],
        };
      }
    },
    enabled: Boolean(userId) && !portfoliosLoading,
    staleTime: 30 * 1000, // 30 seconds - shorter for dynamic updates
  });
};