import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';

interface FilterOptions {
  statusOptions: { value: string; label: string }[];
  propertyTypeOptions: { value: string; label: string }[];
}

export const useFilterOptions = (userId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);

  return useQuery({
    queryKey: ['filter-options', userId, portfolioId],
    queryFn: async (): Promise<FilterOptions> => {
      if (!userId) {
        return {
          statusOptions: [],
          propertyTypeOptions: [],
        };
      }

      try {
        // Get unique statuses from properties (dynamic - only show existing statuses)
        let statusQuery = supabase
          .from('properties')
          .select('status')
          .eq('owner_id', userId)
          .not('status', 'is', null)
          .is('deleted_at', null);

        // Only add portfolio filter for valid UUIDs
        if (portfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId)) {
          statusQuery = statusQuery.eq('portfolio_id', portfolioId);
        }

        const { data: statusData, error: statusError } = await statusQuery;

        if (statusError) {
          console.error('Error fetching status options:', statusError);
          throw statusError;
        }

        // Process unique statuses (only existing ones)
        const uniqueStatuses = [...new Set(statusData?.map(item => item.status).filter(Boolean))];
        const statusOptions = uniqueStatuses.map(status => ({
          value: status,
          label: status.charAt(0).toUpperCase() + status.slice(1),
        }));

        // Define all possible property types (based on database schema)
        const allResidentialTypes = [
          { value: 'house', label: 'House' },
          { value: 'apartment', label: 'Apartment' },
          { value: 'townhouse', label: 'Townhouse' },
          { value: 'duplex', label: 'Duplex' },
          { value: 'triplex', label: 'Triplex' },
          { value: 'fourplex', label: 'Fourplex' },
          { value: 'mobile_home', label: 'Mobile Home' },
          { value: 'manufactured_home', label: 'Manufactured Home' },
          { value: 'commercial', label: 'Commercial' }
        ];

        const allCommercialTypes = [
          { value: 'office_building', label: 'Office Building' },
          { value: 'warehouse_distribution', label: 'Warehouse Distribution' },
          { value: 'retail', label: 'Retail' },
          { value: 'shopping_center', label: 'Shopping Center' },
          { value: 'industrial', label: 'Industrial' },
          { value: 'manufacturing', label: 'Manufacturing' },
          { value: 'flex_space', label: 'Flex Space' },
          { value: 'hotel', label: 'Hotel' },
          { value: 'motel', label: 'Motel' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'medical', label: 'Medical' },
          { value: 'marina', label: 'Marina' },
          { value: 'self_storage', label: 'Self Storage' },
          { value: 'mixed_use', label: 'Mixed Use' },
          { value: 'golf_course', label: 'Golf Course' },
          { value: 'prison', label: 'Prison' }
        ];

        // Check what types actually exist in user's data
        let residentialTypeQuery = supabase
          .from('properties')
          .select('property_type')
          .eq('owner_id', userId)
          .not('property_type', 'is', null)
          .is('deleted_at', null);

        // Only add portfolio filter for valid UUIDs
        if (portfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId)) {
          residentialTypeQuery = residentialTypeQuery.eq('portfolio_id', portfolioId);
        }

        const { data: residentialData } = await residentialTypeQuery;

        // Get commercial property types from portfolio_assets (real estate category)
        let commercialAssetQuery = supabase
          .from('portfolio_assets')
          .select('metadata, asset_category_id')
          .eq('created_by', userId)
          .eq('is_active', true)
          .eq('asset_category_id', '7678da9c-50e3-47f4-ab09-555cd80fccdd'); // Real estate category

        // Only add portfolio filter for valid UUIDs
        if (portfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId)) {
          commercialAssetQuery = commercialAssetQuery.eq('portfolio_id', portfolioId);
        }

        const { data: commercialData } = await commercialAssetQuery;

        // Get existing residential types
        const existingResidentialTypes = new Set(
          residentialData?.map(item => item.property_type).filter(Boolean) || []
        );

        // Get existing commercial types from metadata.subcategory
        const existingCommercialTypes = new Set<string>();
        if (commercialData) {
          commercialData.forEach(asset => {
            if (asset.metadata && typeof asset.metadata === 'object' && asset.metadata !== null) {
              const metadata = asset.metadata as any;
              if (metadata.subcategory) {
                existingCommercialTypes.add(metadata.subcategory);
              }
            }
          });
        }

        // Filter to show all types - always show comprehensive list for filtering
        const propertyTypeOptions = [...allResidentialTypes, ...allCommercialTypes];

        return {
          statusOptions,
          propertyTypeOptions,
        };
      } catch (error) {
        console.error('Error in useFilterOptions:', error);
        return {
          statusOptions: [],
          propertyTypeOptions: [],
        };
      }
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};