import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { PROPERTIES_KEYS } from '@/lib/queryKeys';
import { useEffect } from 'react';

interface PropertyUnit {
  id: string;
  unit_number: string | null;
  monthly_rent: number | null;
  status: string | null;
}

interface PropertyWithUnits {
  id: string;
  address: string;
  portfolio_id?: string;
  property_units: PropertyUnit[];
}

export const useAllPropertiesWithUnits = (userId?: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  console.log('🔍 [ALL_PROPERTIES] Hook called with:', { 
    userId, 
    rawPortfolioId, 
    normalizedPortfolioId: portfolioId,
    timestamp: new Date().toISOString()
  });

  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (userId) {
      console.log('🔍 [ALL_PROPERTIES] Portfolio changed, invalidating cache:', { userId, portfolioId });
      queryClient.invalidateQueries({ 
        queryKey: PROPERTIES_KEYS.withUnits(),
        exact: false 
      });
    }
  }, [userId, portfolioId, queryClient]);

  return useQuery({
    queryKey: PROPERTIES_KEYS.allWithUnits(userId || 'nouser', portfolioId),
    queryFn: async (): Promise<PropertyWithUnits[]> => {
      console.log('🔍 [ALL_PROPERTIES] Executing query with params:', { userId, portfolioId });
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          owner_id,
          portfolio_id,
          monthly_rent,
          is_voucher_property,
          voucher_type,
          tenant_portion,
          voucher_portion,
          property_units (
            id,
            unit_number,
            monthly_rent,
            status
          )
        `)
        .is('deleted_at', null)
        .order('address');

      // Add user filter for RLS compliance
      if (userId) {
        query = query.eq('owner_id', userId);
      }

      // Only add portfolio filter for valid UUIDs
      if (portfolioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId)) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      console.log('🔍 [ALL_PROPERTIES] Query result:', { 
        count: data?.length || 0, 
        properties: data?.map(p => ({ 
          id: p.id, 
          address: p.address, 
          portfolio_id: p.portfolio_id,
          units_count: p.property_units?.length || 0
        })),
        error 
      });

      if (error) {
        console.error('🔍 [ALL_PROPERTIES] Query error:', error);
        throw error;
      }

      console.log('🔍 [ALL_PROPERTIES] Final result - returning', data?.length || 0, 'properties');
      return data || [];
    },
    enabled: !!userId, // Only run when we have a valid user ID
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    retry: (failureCount, error) => {
      console.log('🔍 [ALL_PROPERTIES] Query retry attempt:', failureCount, error);
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // Remove initialData to prevent cache conflicts
  });
};

// Helper function to convert properties with units to selector options
export const getUnitOptionsFromAllProperties = (properties: PropertyWithUnits[]) => {
  const options: Array<{
    value: string;
    label: string;
    propertyId: string;
    address: string;
  }> = [];

  properties.forEach((property) => {
    if (property.property_units && property.property_units.length > 0) {
      // Multi-unit property - add each unit as separate option
      property.property_units.forEach((unit) => {
        options.push({
          value: unit.id,
          label: `${property.address}${unit.unit_number ? ` - Unit ${unit.unit_number}` : ''}`,
          propertyId: property.id,
          address: property.address
        });
      });
    } else {
      // Single property without units
      options.push({
        value: property.id,
        label: property.address,
        propertyId: property.id,
        address: property.address
      });
    }
  });

  return options;
};

// Helper function to get property IDs from selected unit IDs
export const getPropertyIdsFromAllUnitIds = (properties: PropertyWithUnits[], selectedUnitIds: string[]) => {
  const propertyIds = new Set<string>();
  
  selectedUnitIds.forEach(unitId => {
    // Check if it's a unit ID
    const propertyWithUnit = properties.find(p => 
      p.property_units?.some(u => u.id === unitId)
    );
    
    if (propertyWithUnit) {
      propertyIds.add(propertyWithUnit.id);
    } else {
      // It might be a property ID directly (single property without units)
      const directProperty = properties.find(p => p.id === unitId);
      if (directProperty) {
        propertyIds.add(directProperty.id);
      }
    }
  });
  
  return Array.from(propertyIds);
};