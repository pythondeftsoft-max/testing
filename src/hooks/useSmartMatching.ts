import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SmartMatch {
  id: string;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    budget: number;
    move_in_date?: string;
    voucher_status?: string;
    pets?: boolean;
  };
  property: {
    id: string;
    address: string;
    monthly_rent: number;
    bedrooms: number;
    bathrooms: number;
    pet_friendly?: boolean;
    voucher_accepted?: boolean;
    owner_id: string;
  };
  compatibilityScore: number;
  matchReasons: string[];
  urgency: 'high' | 'medium' | 'low';
}

interface MatchingCriteria {
  budgetTolerance: number; // percentage
  locationRadius: number; // miles
  includeVoucherMatches: boolean;
  includePetMatches: boolean;
}

const calculateCompatibilityScore = (tenant: any, property: any): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // Budget compatibility (30% weight)
  const budgetRatio = tenant.budget / property.monthly_rent;
  if (budgetRatio >= 1.0) {
    score += 30;
    reasons.push('Budget perfectly matches rent');
  } else if (budgetRatio >= 0.9) {
    score += 25;
    reasons.push('Budget closely matches rent');
  } else if (budgetRatio >= 0.8) {
    score += 15;
    reasons.push('Budget within acceptable range');
  }

  // Voucher compatibility (25% weight)
  if (tenant.voucher_status === 'voucher' && property.voucher_accepted) {
    score += 25;
    reasons.push('Voucher tenant matches voucher-accepting property');
  } else if (tenant.voucher_status !== 'voucher' && !property.voucher_accepted) {
    score += 20;
    reasons.push('Non-voucher tenant for standard property');
  }

  // Pet compatibility (20% weight)
  if (tenant.pets && property.pet_friendly) {
    score += 20;
    reasons.push('Pet owner matches pet-friendly property');
  } else if (!tenant.pets) {
    score += 15;
    reasons.push('No pet restrictions');
  }

  // Move-in urgency (15% weight)
  if (tenant.move_in_date) {
    const moveInDate = new Date(tenant.move_in_date);
    const daysUntilMoveIn = Math.ceil((moveInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilMoveIn <= 30) {
      score += 15;
      reasons.push('Urgent move-in timeline');
    } else if (daysUntilMoveIn <= 60) {
      score += 10;
      reasons.push('Near-term move-in timeline');
    }
  }

  // Property size appropriateness (10% weight)
  if (property.bedrooms >= 1) {
    score += 10;
    reasons.push('Appropriate property size');
  }

  return { score, reasons };
};

const determineUrgency = (tenant: any): 'high' | 'medium' | 'low' => {
  if (!tenant.move_in_date) return 'low';
  
  const moveInDate = new Date(tenant.move_in_date);
  const daysUntilMoveIn = Math.ceil((moveInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilMoveIn <= 14) return 'high';
  if (daysUntilMoveIn <= 30) return 'medium';
  return 'low';
};

export const useSmartMatching = (criteria: MatchingCriteria = {
  budgetTolerance: 20,
  locationRadius: 10,
  includeVoucherMatches: true,
  includePetMatches: true
}) => {
  return useQuery({
    queryKey: ['smart-matching', criteria],
    queryFn: async (): Promise<SmartMatch[]> => {
      console.log('Fetching smart matches with criteria:', criteria);

      // Get available properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          bedrooms,
          bathrooms,
          pet_policy,
          has_voucher,
          owner_id,
          status
        `)
        .eq('status', 'available')
        .not('monthly_rent', 'is', null);

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        throw propertiesError;
      }

      // Get tenant profiles looking for housing
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          user_type,
          tenant_profile:tenant_profiles(
            max_rent,
            preferred_move_date,
            voucher_status,
            has_pets,
            housing_interest
          )
        `)
        .eq('user_type', 'tenant')
        .not('tenant_profile.max_rent', 'is', null);

      if (profilesError) {
        console.error('Error fetching tenant profiles:', profilesError);
        throw profilesError;
      }

      // Filter tenants who are actively seeking housing
      const seekingTenants = profiles?.filter(profile => 
        Array.isArray(profile.tenant_profile) && 
        profile.tenant_profile.some((tp: any) => tp.housing_interest === true)
      ) || [];

      console.log('Found properties:', properties?.length);
      console.log('Found seeking tenants:', seekingTenants.length);

      // Generate matches
      const matches: SmartMatch[] = [];

      for (const tenant of seekingTenants) {
        if (!Array.isArray(tenant.tenant_profile) || tenant.tenant_profile.length === 0) continue;
        
        const tenantProfile = tenant.tenant_profile[0];
        if (!tenantProfile) continue;

        for (const property of properties || []) {
          const tenantData = {
            budget: tenantProfile.max_rent,
            move_in_date: tenantProfile.preferred_move_date,
            voucher_status: tenantProfile.voucher_status,
            pets: tenantProfile.has_pets
          };

          const propertyData = {
            ...property,
            pet_friendly: property.pet_policy !== 'not_allowed',
            voucher_accepted: property.has_voucher
          };

          const { score, reasons } = calculateCompatibilityScore(tenantData, propertyData);

          // Only include matches with score >= 40% (reasonable threshold)
          if (score >= 40) {
            matches.push({
              id: `${tenant.id}-${property.id}`,
              tenant: {
                id: tenant.id,
                name: `${tenant.first_name} ${tenant.last_name}`,
                email: tenant.email,
                phone: tenant.phone,
                budget: tenantProfile.max_rent,
                move_in_date: tenantProfile.preferred_move_date,
                voucher_status: tenantProfile.voucher_status,
                pets: tenantProfile.has_pets
              },
              property: {
                id: property.id,
                address: property.address,
                monthly_rent: property.monthly_rent,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                pet_friendly: property.pet_policy !== 'not_allowed',
                voucher_accepted: property.has_voucher,
                owner_id: property.owner_id
              },
              compatibilityScore: score,
              matchReasons: reasons,
              urgency: determineUrgency(tenantData)
            });
          }
        }
      }

      // Sort by compatibility score (descending) and then by urgency
      return matches.sort((a, b) => {
        if (a.urgency === 'high' && b.urgency !== 'high') return -1;
        if (b.urgency === 'high' && a.urgency !== 'high') return 1;
        return b.compatibilityScore - a.compatibilityScore;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useInitiateMatch = () => {
  const initiateMatch = async (match: SmartMatch) => {
    console.log('Initiating match:', match);

    // Generate a random invitation token (32 bytes as hex = 64 characters)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const invitation_token = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data, error } = await supabase
      .from('tenant_invitations')
      .insert({
        property_id: match.property.id,
        landlord_id: match.property.owner_id,
        tenant_name: match.tenant.name,
        tenant_email: match.tenant.email,
        monthly_rent: match.property.monthly_rent,
        tenant_type: match.tenant.voucher_status === 'voucher' ? 'voucher' : 'regular',
        tenant_portion: match.tenant.voucher_status === 'voucher' 
          ? Math.round(match.property.monthly_rent * 0.3) 
          : match.property.monthly_rent,
        pha_portion: match.tenant.voucher_status === 'voucher' 
          ? Math.round(match.property.monthly_rent * 0.7) 
          : 0,
        status: 'pending',
        invitation_token,
        invitation_data: {
          compatibility_score: match.compatibilityScore,
          match_reasons: match.matchReasons,
          smart_match_initiated: true
        }
      });

    if (error) {
      console.error('Error creating tenant invitation:', error);
      throw error;
    }

    return data;
  };

  return { initiateMatch };
};
