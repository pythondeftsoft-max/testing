import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { PROPERTIES_KEYS } from '@/lib/queryKeys';
import { useEffect } from 'react';

interface PropertyUnit {
  id: string;
  unit_number: string;
  monthly_rent?: number;
  status?: string;
}

interface PropertyWithUnits {
  id: string;
  address: string;
  portfolio_id?: string;
  property_units: PropertyUnit[];
}

export const useUserPropertiesWithUnits = (userId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  console.log('🔍 [USER_PROPERTIES] Hook called with:', { 
    userId, 
    rawPortfolioId, 
    normalizedPortfolioId: portfolioId,
    timestamp: new Date().toISOString()
  });
  
  return useQuery({
    queryKey: PROPERTIES_KEYS.allWithUnits(userId || 'nouser', portfolioId),
    queryFn: async (): Promise<PropertyWithUnits[]> => {
      if (!userId) {
        console.log('🔍 [USER_PROPERTIES] No userId provided, returning empty array');
        return [];
      }

      console.log('🔍 [USER_PROPERTIES] Executing query with params:', { userId, portfolioId });

      try {
        let query = supabase
          .from('properties')
          .select(`
            id, 
            address, 
            portfolio_id,
            monthly_rent,
            is_voucher_property,
            voucher_type,
            tenant_portion,
            voucher_portion,
            property_units(
              id,
              unit_number,
              monthly_rent,
              status
            )
          `)
          .eq('owner_id', userId)
          .order('address');

        console.log('🔍 [USER_PROPERTIES] Base query created for user:', userId);

        // Filter by portfolio if specified (portfolioId is already normalized)
        if (portfolioId) {
          console.log('🔍 [USER_PROPERTIES] Adding portfolio filter:', portfolioId);
          query = query.eq('portfolio_id', portfolioId);
        } else {
          console.log('🔍 [USER_PROPERTIES] No portfolio filter - showing all properties for portfolioId:', portfolioId);
        }

        console.log('🔍 [USER_PROPERTIES] Executing final query...');
        const { data, error } = await query;

        console.log('🔍 [USER_PROPERTIES] Raw query result:', { 
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
          console.error('🔍 [USER_PROPERTIES] Query error:', error);
          throw error;
        }

        console.log('🔍 [USER_PROPERTIES] Final result - returning', data?.length || 0, 'properties');
        return data || [];
      } catch (error) {
        console.error('🔍 [USER_PROPERTIES] Unexpected error fetching properties with units:', error);
        return [];
      }
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes - better caching for performance
    gcTime: 10 * 60 * 1000, // 10 minutes - longer cache time
    refetchOnMount: false, // Don't refetch on every mount
  });
};

// Helper function to convert properties with units to unit options for selectors
export const getUnitOptionsFromProperties = (properties: PropertyWithUnits[]) => {
  const options: Array<{ value: string; label: string; propertyId: string; address: string }> = [];
  
  properties.forEach(property => {
    if (property.property_units && property.property_units.length > 0) {
      // Multi-unit property - add each unit as an option
      property.property_units.forEach(unit => {
        options.push({
          value: unit.id,
          label: `${property.address} - Unit ${unit.unit_number}`,
          propertyId: property.id,
          address: property.address
        });
      });
    } else {
      // Single property - add the property itself
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
export const getPropertyIdsFromUnitIds = (properties: PropertyWithUnits[], selectedUnitIds: string[]) => {
  const propertyIds = new Set<string>();
  
  selectedUnitIds.forEach(unitId => {
    properties.forEach(property => {
      // Check if this is a property ID (direct match)
      if (property.id === unitId) {
        propertyIds.add(property.id);
        return;
      }
      
      // Check if this is a unit ID
      if (property.property_units?.some(unit => unit.id === unitId)) {
        propertyIds.add(property.id);
      }
    });
  });
  
  return Array.from(propertyIds);
};