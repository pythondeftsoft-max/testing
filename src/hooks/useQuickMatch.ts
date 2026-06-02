import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { useApiMatchScoring, createScoreMap, ApiPropertyMatch, ApiTenantMatch } from './useApiMatchScoring';
import { 
  calculateOverallScoreV2, 
  calculateBudgetScoreV2, 
  calculateBedroomScoreV2, 
  calculateTimingScoreV2,
  calculateLocationScoreFallback,
  getTierFromScore,
} from '@/lib/matchScoring';

export type MatchMode = 'tenant' | 'property';
export type MatchTier = 'hot_match' | 'decent_match' | 'no_match' | 'excluded' | null;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  user_type: string | null;
  desired_bedrooms: number | null;
  max_budget: number | null;
  preferred_location: string | null;
  desired_move_in_date: string | null;
  full_name?: string;
  housing_status?: string;
  // Full tenant_profiles data
  city: string | null;
  state: string | null;
  zip_code: string | null;
  rent_range_min: number | null;
  rent_range_max: number | null;
  max_rent: number | null;
  bedrooms_approved: number[] | null;
  voucher_holder: boolean;
  voucher_amount: number | null;
  move_in_window: string | null;
  has_pets: boolean;
  pet_type: string | null;
  created_at: string;
  pipeline_stage: string | null;
  assigned_worker_id: string | null;
  // New fields for assigned worker and housing authority
  assigned_worker_name: string | null;
  housing_authority: string | null;
}

interface Property {
  id: string;
  property_id: string;
  address: string;
  unit_number: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string | null;
  available_date: string | null;
  owner_id: string | null;
  listed_by: 'admin' | 'landlord' | null;
  created_at: string;
  on_market: boolean;
  is_multi_unit: boolean;
  country: string | null;
  photos: string[];
  unit_photos: string[];
  latitude: number | null;
  longitude: number | null;
  pets_allowed?: boolean | null;
}

export const calculateDaysOnMarket = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
};

// V4 score breakdown — pets and freshness are hard filters / removed
interface ScoreBreakdown {
  location: number;
  budget: number;
  bedrooms: number;
  timing: number;
  move_in?: number;
}

export interface Match {
  tenant: Profile;
  property: Property;
  score: number;
  breakdown: ScoreBreakdown;
  // API-enhanced fields
  tier?: MatchTier;
  driveTime?: number | null;
  driveTimeLabel?: string;
  // Track if this is from API or fallback
  scoreSource?: 'api' | 'fallback';
}

export const useQuickMatch = (mode: MatchMode, selectedId: string | null) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch API match scores (single source of truth for scoring)
  const { data: apiMatchData, isLoading: isLoadingApiScores } = useApiMatchScoring(mode, selectedId);

  // Fetch all tenants with full profile data including assigned worker
  const { data: tenants } = useQuery({
    queryKey: ['unhoused-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tenant_profiles(*),
          assigned_worker:profiles!assigned_worker_id(first_name, last_name)
        `)
        .eq('user_type', 'tenant')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone || null,
        user_type: p.user_type,
        desired_bedrooms: p.tenant_profiles?.bedrooms_approved?.[0] || p.desired_bedrooms || null,
        max_budget: p.tenant_profiles?.max_rent || p.max_budget || null,
        preferred_location: p.preferred_location || null,
        desired_move_in_date: p.desired_move_in_date || null,
        full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || null,
        housing_status: p.housing_status || 'seeking',
        // Full tenant_profiles data
        city: p.tenant_profiles?.city || null,
        state: p.tenant_profiles?.state || null,
        zip_code: p.tenant_profiles?.zip_code || null,
        rent_range_min: p.tenant_profiles?.rent_range_min ?? null,
        rent_range_max: p.tenant_profiles?.rent_range_max ?? null,
        max_rent: p.tenant_profiles?.max_rent ?? null,
        bedrooms_approved: p.tenant_profiles?.bedrooms_approved ?? null,
        voucher_holder: p.tenant_profiles?.voucher_holder ?? false,
        voucher_amount: p.tenant_profiles?.voucher_amount ?? null,
        move_in_window: p.tenant_profiles?.move_in_window || null,
        has_pets: p.tenant_profiles?.has_pets || false,
        pet_type: p.tenant_profiles?.pet_type || null,
        created_at: p.created_at,
        pipeline_stage: p.pipeline_stage || null,
        assigned_worker_id: p.assigned_worker_id || null,
        // New fields
        assigned_worker_name: p.assigned_worker 
          ? `${p.assigned_worker.first_name || ''} ${p.assigned_worker.last_name || ''}`.trim() 
          : null,
        housing_authority: p.tenant_profiles?.housing_authority || null,
      })) as Profile[];
    },
  });

  // Fetch ON-MARKET properties only, flattening multi-unit to individual listings
  const { data: properties } = useQuery({
    queryKey: ['available-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_units(*),
          owner:profiles!fk_properties_owner(user_type)
        `)
        .is('deleted_at', null)
        .or('country.eq.US,country.is.null')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Flatten to unit-level listings (like Pipeline does)
      const listings: Property[] = [];

      (data || []).forEach((p: any) => {
        const isMultiUnit = p.unit_count > 1 || (p.property_units?.length > 1);
        
        if (isMultiUnit) {
          // Skip non-US properties entirely
          if (p.country && p.country !== 'US') return;
          
          // For multi-unit: Show each ON-MARKET unit as its own listing
          (p.property_units || []).forEach((unit: any) => {
            if (unit.on_market === true) {
              listings.push({
                id: unit.id,
                property_id: p.id,
                address: p.address,
                unit_number: unit.unit_number || unit.unit_name || null,
                city: p.city || null,
                state: p.state || null,
                zipcode: p.zipcode || null,
                monthly_rent: unit.monthly_rent || p.monthly_rent || null,
                bedrooms: unit.bedrooms || p.bedrooms || null,
                bathrooms: unit.bathrooms || p.bathrooms || null,
                status: unit.status || p.status || null,
                available_date: p.available_date || null,
                owner_id: p.owner_id || null,
                listed_by: p.owner?.user_type === 'admin' ? 'admin' : 'landlord',
                created_at: p.created_at,
                on_market: true,
                is_multi_unit: true,
                country: p.country || 'US',
                photos: p.photos || [],
                unit_photos: unit.photos || unit.unit_photos || [],
                latitude: p.latitude || null,
                longitude: p.longitude || null,
              });
            }
          });
        } else {
          // For single-unit: Only show if property is on_market AND is a US property
          if (p.on_market === true && (p.country === 'US' || !p.country)) {
            // Check if there's a unit record with rent (even for single-unit properties)
            const firstUnit = p.property_units?.[0];
            
            listings.push({
              id: p.id,
              property_id: p.id,
              address: p.address,
              unit_number: firstUnit?.unit_number || null,
              city: p.city || null,
              state: p.state || null,
              zipcode: p.zipcode || null,
              monthly_rent: firstUnit?.monthly_rent || p.monthly_rent || null,
              bedrooms: firstUnit?.bedrooms || p.bedrooms || null,
              bathrooms: firstUnit?.bathrooms || p.bathrooms || null,
              status: firstUnit?.status || p.status || null,
              available_date: p.available_date || null,
              owner_id: p.owner_id || null,
              listed_by: p.owner?.user_type === 'admin' ? 'admin' : 'landlord',
              created_at: p.created_at,
              on_market: true,
              is_multi_unit: false,
              country: p.country || 'US',
              photos: p.photos || [],
              unit_photos: firstUnit?.unit_photos || [],
              latitude: p.latitude || null,
              longitude: p.longitude || null,
            });
          }
        }
      });

      return listings;
    },
  });

  // Fetch selected tenant or property
  const { data: selectedTenant } = useQuery({
    queryKey: ['selected-tenant', selectedId],
    queryFn: async () => {
      if (!selectedId || mode !== 'tenant') return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedId)
        .single();
      
      if (error) throw error;
      const p: any = data;
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        user_type: p.user_type,
        desired_bedrooms: p.desired_bedrooms || null,
        max_budget: p.max_budget || null,
        preferred_location: p.preferred_location || null,
        desired_move_in_date: p.desired_move_in_date || null,
        full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || null,
        housing_status: 'seeking',
      } as Profile;
    },
    enabled: mode === 'tenant' && !!selectedId,
  });

  const { data: selectedProperty } = useQuery({
    queryKey: ['selected-property', selectedId],
    queryFn: async () => {
      if (!selectedId || mode !== 'property') return null;
      
      // First try to find as a property_unit (for multi-unit selections)
      const { data: unitData } = await supabase
        .from('property_units')
        .select(`
          *,
          properties!inner(
            *,
            owner:profiles!fk_properties_owner(user_type)
          )
        `)
        .eq('id', selectedId)
        .single();
      
      if (unitData) {
        const p = unitData.properties as any;
        return {
          id: unitData.id,
          property_id: p.id,
          address: p.address,
          unit_number: unitData.unit_number || unitData.unit_name || null,
          city: p.city || null,
          state: p.state || null,
          zipcode: p.zipcode || null,
          monthly_rent: unitData.monthly_rent || p.monthly_rent || null,
          bedrooms: unitData.bedrooms || p.bedrooms || null,
          bathrooms: unitData.bathrooms || p.bathrooms || null,
          status: unitData.status || p.status || null,
          available_date: p.available_date || null,
          owner_id: p.owner_id || null,
          listed_by: p.owner?.user_type === 'admin' ? 'admin' : 'landlord',
          created_at: p.created_at,
          on_market: unitData.on_market || false,
          is_multi_unit: true,
          photos: p.photos || [],
          unit_photos: (unitData as any).unit_photos || [],
          latitude: p.latitude || null,
          longitude: p.longitude || null,
        } as Property;
      }
      
      // Fallback to property lookup (for single-unit properties)
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_units(*),
          owner:profiles!fk_properties_owner(user_type)
        `)
        .eq('id', selectedId)
        .single();
      
      if (error) throw error;
      const p: any = data;
      return {
        id: p.id,
        property_id: p.id,
        address: p.address,
        unit_number: null,
        city: p.city || null,
        state: p.state || null,
        zipcode: p.zipcode || null,
        monthly_rent: p.monthly_rent || null,
        bedrooms: p.bedrooms || null,
        bathrooms: p.bathrooms || null,
        status: p.status || null,
        available_date: p.available_date || null,
        owner_id: p.owner_id || null,
        listed_by: p.owner?.user_type === 'admin' ? 'admin' : 'landlord',
        created_at: p.created_at,
        on_market: p.on_market || false,
        is_multi_unit: false,
        photos: p.photos || [],
        unit_photos: [],
        latitude: p.latitude || null,
        longitude: p.longitude || null,
      } as Property;
    },
    enabled: mode === 'property' && !!selectedId,
  });

  // Calculate matches - now using API scores when available
  const matches = useMemo(() => {
    if (!selectedId) return [];

    // Build score map from API response
    const apiScoreMap = apiMatchData 
      ? createScoreMap(
          'matches' in apiMatchData ? apiMatchData.matches : [],
          mode
        )
      : new Map();

    if (mode === 'tenant' && selectedTenant && properties) {
      return properties.map(property => {
        // Check if we have API scores for this property
        const apiScore = apiScoreMap.get(property.id);
        
        // Use API score if available, otherwise calculate locally (fallback)
        if (apiScore) {
          const apiBreakdown = apiScore.breakdown as { location: number; budget: number; bedrooms: number; pets: number; move_in: number };
          return {
            tenant: selectedTenant,
            property,
            score: apiScore.score,
          breakdown: {
              location: apiBreakdown.location,
              budget: apiBreakdown.budget,
              bedrooms: apiBreakdown.bedrooms,
              timing: apiBreakdown.move_in,
            },
            tier: apiScore.tier as MatchTier,
            driveTime: apiScore.driveTime,
            scoreSource: 'api' as const,
          };
        }

        // Fallback to local V2 calculation
        const locationScore = calculateLocationScoreFallback(
          selectedTenant.city,
          selectedTenant.state,
          selectedTenant.zip_code,
          property.city,
          property.state,
          property.zipcode
        );
        
        const breakdown: ScoreBreakdown = {
          location: locationScore,
          budget: calculateBudgetScoreV2(selectedTenant.max_budget, property.monthly_rent),
          bedrooms: calculateBedroomScoreV2(selectedTenant.desired_bedrooms, property.bedrooms, selectedTenant.voucher_holder),
          timing: calculateTimingScoreV2(selectedTenant.move_in_window, selectedTenant.desired_move_in_date, property.available_date),
        };

        const score = calculateOverallScoreV2(breakdown);
        
        return {
          tenant: selectedTenant,
          property,
          score,
          breakdown,
          tier: getTierFromScore(score),
          driveTime: null,
          scoreSource: 'fallback' as const,
        };
      }).sort((a, b) => b.score - a.score);
    }

    if (mode === 'property' && selectedProperty && tenants) {
      return tenants.map(tenant => {
        // Check if we have API scores for this tenant
        const apiScore = apiScoreMap.get(tenant.id);
        
        // Use API score if available
        if (apiScore) {
          const apiBreakdown = apiScore.breakdown as { location: number; budget: number; bedrooms: number; pets: number; move_in: number };
          return {
            tenant,
            property: selectedProperty,
            score: apiScore.score,
            breakdown: {
              location: apiBreakdown.location,
              budget: apiBreakdown.budget,
              bedrooms: apiBreakdown.bedrooms,
              timing: apiBreakdown.move_in,
            },
            tier: null, // Property mode doesn't include tier yet
            driveTime: null,
            scoreSource: 'api' as const,
          };
        }

        // Fallback to local V2 calculation
        const locationScore = calculateLocationScoreFallback(
          tenant.city,
          tenant.state,
          tenant.zip_code,
          selectedProperty.city,
          selectedProperty.state,
          selectedProperty.zipcode
        );
        
        const breakdown: ScoreBreakdown = {
          location: locationScore,
          budget: calculateBudgetScoreV2(tenant.max_budget, selectedProperty.monthly_rent),
          bedrooms: calculateBedroomScoreV2(tenant.desired_bedrooms, selectedProperty.bedrooms, tenant.voucher_holder),
          timing: calculateTimingScoreV2(tenant.move_in_window, tenant.desired_move_in_date, selectedProperty.available_date),
        };

        const score = calculateOverallScoreV2(breakdown);

        return {
          tenant,
          property: selectedProperty,
          score,
          breakdown,
          tier: getTierFromScore(score),
          driveTime: null,
          scoreSource: 'fallback' as const,
        };
      }).sort((a, b) => b.score - a.score);
    }

    return [];
  }, [mode, selectedId, selectedTenant, selectedProperty, tenants, properties, apiMatchData]);

  const currentMatch = matches[currentIndex] || null;
  const hasNext = currentIndex < matches.length - 1;
  const hasPrevious = currentIndex > 0;

  const next = () => {
    if (hasNext) setCurrentIndex(prev => prev + 1);
  };

  const previous = () => {
    if (hasPrevious) setCurrentIndex(prev => prev - 1);
  };

  const reset = () => setCurrentIndex(0);

  const jumpTo = (index: number) => {
    if (index >= 0 && index < matches.length) {
      setCurrentIndex(index);
    }
  };

  return {
    tenants: tenants || [],
    properties: properties || [],
    selectedTenant,
    selectedProperty,
    matches,
    currentMatch,
    currentIndex,
    totalMatches: matches.length,
    remainingMatches: matches.length - currentIndex - 1,
    hasNext,
    hasPrevious,
    next,
    previous,
    reset,
    jumpTo,
    isLoadingApiScores,
  };
};
