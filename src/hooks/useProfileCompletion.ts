import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MissingField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'checkbox' | 'radio';
}

const HOUSING_SEEKER_FIELDS = [
  'voucher_status',
  'housing_authority',
  'bedrooms_approved',
  'rent_range_min',
  'rent_range_max',
  'move_in_window',
  'credit_score_range',
  'employment_status',
  'monthly_income',
  'has_eviction',
  'has_pets',
  'has_felonies',
  'has_accessibility_needs',
] as const;

const US_LOCATION_FIELDS = ['state', 'city', 'zip_code'] as const;

const FIELD_LABELS: Record<string, string> = {
  state: 'State',
  city: 'City',
  zip_code: 'Zip Code',
  voucher_status: 'Voucher Status',
  housing_authority: 'Housing Authority',
  bedrooms_approved: 'Bedrooms Approved',
  rent_range_min: 'Minimum Rent',
  rent_range_max: 'Maximum Rent',
  move_in_window: 'Move-in Timeline',
  credit_score_range: 'Credit Score Range',
  employment_status: 'Employment Status',
  monthly_income: 'Yearly Income',
  has_eviction: 'Eviction History',
  has_pets: 'Pet Ownership',
  has_felonies: 'Felony History',
  has_accessibility_needs: 'Accessibility Needs',
};

function getRequiredFields(tenantIntent: string | null | undefined, countryCode: string | null | undefined): string[] {
  // Rent trackers have no required profile fields
  if (tenantIntent === 'rent_tracker') {
    return [];
  }

  // Housing seekers (default) need housing fields
  const fields: string[] = [...HOUSING_SEEKER_FIELDS];

  // Only US users (or unset, defaulting to US) need location fields
  const country = countryCode || 'US';
  if (country === 'US') {
    fields.unshift(...US_LOCATION_FIELDS);
  }

  return fields;
}

export const useProfileCompletion = (userId: string | undefined) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profile-completion', userId],
    queryFn: async () => {
      if (!userId) return { isComplete: true, missingFields: [], profile: null };

      const { data: profile, error } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant profile:', error);
        return { isComplete: true, missingFields: [], profile: null };
      }

      if (!profile) {
        // No profile exists - treat as complete to avoid blocking dashboard
        return {
          isComplete: true,
          missingFields: [],
          profile: null,
        };
      }

      // Build required fields dynamically based on intent and country
      const requiredFields = getRequiredFields(profile.tenant_intent, profile.country_code);

      // If no fields are required (rent tracker), profile is complete
      if (requiredFields.length === 0) {
        return { isComplete: true, missingFields: [], profile };
      }

      // Check which fields are missing
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        const value = profile[field as keyof typeof profile];
        
        if (value === null || value === undefined) {
          missingFields.push(field);
        } else if (typeof value === 'string' && value.trim() === '') {
          missingFields.push(field);
        } else if (Array.isArray(value) && value.length === 0) {
          missingFields.push(field);
        }
        // For booleans, only null/undefined counts as missing (false is valid)
      }

      return {
        isComplete: missingFields.length === 0,
        missingFields,
        profile,
      };
    },
    enabled: !!userId,
    retry: false,
    staleTime: 30000,
  });

  return {
    isComplete: data?.isComplete ?? true,
    missingFields: data?.missingFields ?? [],
    profile: data?.profile ?? null,
    isLoading,
    refetch,
    getFieldLabel: (field: string) => FIELD_LABELS[field] || field,
  };
};
