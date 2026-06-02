import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiMatchBreakdown {
  location: number;
  budget: number;
  bedrooms: number;
  pets: number;
  move_in: number;
}

export interface ApiPropertyMatch {
  unit_id: string;
  property_id: string;
  address: string;
  unit_number: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  rent: number | null;
  bedrooms: number | null;
  pets_allowed: boolean;
  score: number;
  tier: 'hot_match' | 'decent_match' | 'no_match' | 'excluded';
  drive_time_minutes: number | null;
  drive_time_label: string;
  drive_time_source: 'google' | 'cache' | 'estimated';
  breakdown: ApiMatchBreakdown;
  ownership_type: 'client_managed' | 'landlord_self_managed';
  client: {
    portfolio_id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface ApiTenantMatch {
  tenant_id: string;
  name: string;
  email: string | null;
  budget: number | null;
  bedrooms_approved: number[] | null;
  voucher_holder: boolean;
  location: {
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  score: number;
  breakdown: {
    budget: number;
    bedrooms: number;
    timing: number;
    location: number;
  };
}

interface MatchTenantResponse {
  success: boolean;
  tenant: {
    id: string;
    name: string;
    budget: number | null;
    bedrooms: number | null;
    has_pets: boolean;
    location: {
      city: string | null;
      state: string | null;
      zip: string | null;
    };
  };
  matches: ApiPropertyMatch[];
  excluded_count: number;
  excluded_reason: string | null;
}

interface MatchPropertyResponse {
  success: boolean;
  property: {
    id: string;
    property_id: string;
    address: string;
    rent: number | null;
    bedrooms: number | null;
    location: {
      city: string | null;
      state: string | null;
      zip: string | null;
    };
  };
  matches: ApiTenantMatch[];
}

async function fetchMatchScores(
  mode: 'tenant' | 'property',
  entityId: string
): Promise<MatchTenantResponse | MatchPropertyResponse> {
  const body = mode === 'tenant' 
    ? { tenant_id: entityId, limit: 200 }
    : { property_id: entityId, limit: 200 };

  const { data, error } = await supabase.functions.invoke('agent-matchmaker-api', {
    body: { path: 'match', method: 'POST', ...body },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'API call failed');

  return data;
}

export function useApiMatchScoring(mode: 'tenant' | 'property', entityId: string | null) {
  return useQuery({
    queryKey: ['api-match-scores', mode, entityId],
    queryFn: async () => {
      try {
        return await fetchMatchScores(mode, entityId!);
      } catch (error) {
        console.warn('[useApiMatchScoring] API call failed, falling back to local scoring:', error);
        throw error; // Let React Query handle the error state
      }
    },
    enabled: !!entityId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    // Don't treat API errors as fatal - UI will fall back to local scoring
    meta: {
      errorMessage: 'Match scoring API unavailable - using estimated scores'
    }
  });
}

// Create a map of scores from API matches for quick lookup
export function createScoreMap(
  matches: ApiPropertyMatch[] | ApiTenantMatch[],
  mode: 'tenant' | 'property'
): Map<string, { score: number; tier?: string; driveTime?: number | null; breakdown: any }> {
  const map = new Map();
  
  for (const match of matches) {
    const id = mode === 'tenant' 
      ? (match as ApiPropertyMatch).unit_id 
      : (match as ApiTenantMatch).tenant_id;
    
    const entry = mode === 'tenant'
      ? {
          score: match.score,
          tier: (match as ApiPropertyMatch).tier,
          driveTime: (match as ApiPropertyMatch).drive_time_minutes,
          breakdown: match.breakdown,
        }
      : {
          score: match.score,
          breakdown: match.breakdown,
        };
    
    map.set(id, entry);
  }
  
  return map;
}
