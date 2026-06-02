import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, differenceInHours } from 'date-fns';

export interface PushStats {
  total: number;
  pending: number;
  interested: number;
  declined: number;
  expired: number;
  last_pushed_at: string | null;
}

export interface FinderTenant {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string | null;
  zip_code: string;
  bedrooms_approved: number[];
  rent_range_min: number;
  rent_range_max: number;
  voucher_holder: boolean;
  voucher_amount: number;
  monthly_income: string | number;
  preferred_locations: string[];
  created_at: string;
  updated_at: string | null;
  is_housed: boolean;
  lease_end_date: string | null;
  days_looking: number;
  hours_looking: number;
  housing_authority_id: string | null;
  housing_authority_name: string | null;
  voucher_status: string | null;
  push_stats: PushStats;
}

// Calculate time spent looking based on housing status
function calculateTimeSpent(createdAt: string | null, isHoused: boolean, leaseEndDate: string | null): { days: number; hours: number } {
  const today = new Date();
  
  // Safety check for missing created_at
  if (!createdAt) {
    return { days: 0, hours: 0 };
  }
  
  if (!isHoused) {
    // Unhoused: count from signup date
    const created = new Date(createdAt);
    // Check for invalid date
    if (isNaN(created.getTime())) {
      return { days: 0, hours: 0 };
    }
    const days = differenceInDays(today, created);
    const hours = differenceInHours(today, created);
    return { days, hours };
  }
  
  if (leaseEndDate) {
    // Housed with expiring lease: count from when they hit 45 days left
    const leaseEnd = new Date(leaseEndDate);
    const daysUntilEnd = differenceInDays(leaseEnd, today);
    
    if (daysUntilEnd <= 45) {
      // They've passed the 45-day mark, count days since that point
      const daysLooking = 45 - daysUntilEnd;
      return { days: daysLooking, hours: daysLooking * 24 };
    }
  }
  
  return { days: 0, hours: 0 };
}

export interface InternalMatch {
  id: string;
  property_id: string;
  unit_id: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  property_type: 'apartment' | 'home';
  status: string;
  photos: string[];
  tenant_match_count: number;
  match_score: number;
  // V2 fields from computed_matches
  tier: 'hot_match' | 'decent_match' | 'no_match' | null;
  drive_time_minutes: number | null;
  drive_time_source: 'google' | 'cache' | 'estimated' | null;
  breakdown: {
    location: number;
    budget: number;
    bedrooms: number;
    pets: number;
    move_in: number;
  } | null;
}

export const useFinderTenants = () => {
  return useQuery({
    queryKey: ['finder-tenants'],
    queryFn: async () => {
      // Get all tenant profiles with their housing status
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_profiles')
        .select(`
          id,
          user_id,
          voucher_holder,
          voucher_amount,
          voucher_status,
          monthly_income,
          rent_range_min,
          rent_range_max,
          bedrooms_approved,
          preferred_locations,
          city,
          state,
          zip_code,
          created_at,
          updated_at,
          housing_authority_id,
          housing_authority,
          profiles!tenant_profiles_user_id_fkey (
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (tenantError) throw tenantError;

      // Get active tenant_properties to check housing status
      const { data: housingData, error: housingError } = await supabase
        .from('tenant_properties')
        .select('tenant_id, lease_end_date, is_active')
        .eq('is_active', true);

      if (housingError) throw housingError;

      // Get housing authority names for all PHA ids
      const phaIds = [...new Set((tenantData || []).map((t: any) => t.housing_authority_id).filter(Boolean))];
      const phaMap = new Map<string, string>();
      if (phaIds.length > 0) {
        const { data: phaData } = await supabase
          .from('housing_authorities')
          .select('id, name')
          .in('id', phaIds);
        (phaData || []).forEach((p: any) => phaMap.set(p.id, p.name));
      }

      // Get push stats for all tenants
      const userIds = (tenantData || []).map((t: any) => t.user_id).filter(Boolean);
      const pushStatsMap = new Map<string, PushStats>();
      if (userIds.length > 0) {
        // Batch fetch all pushes for these tenants
        let allPushes: any[] = [];
        let from = 0;
        const batchSize = 1000;
        while (true) {
          const { data: pushBatch, error: pushErr } = await supabase
            .from('property_pushes')
            .select('tenant_id, status, expires_at, pushed_at')
            .in('tenant_id', userIds)
            .range(from, from + batchSize - 1);
          if (pushErr || !pushBatch || pushBatch.length === 0) break;
          allPushes = allPushes.concat(pushBatch);
          if (pushBatch.length < batchSize) break;
          from += batchSize;
        }
        const now = new Date();
        allPushes.forEach((p: any) => {
          const stats = pushStatsMap.get(p.tenant_id) || {
            total: 0, pending: 0, interested: 0, declined: 0, expired: 0, last_pushed_at: null,
          };
          stats.total += 1;
          const isExpired = p.expires_at && new Date(p.expires_at) < now;
          if (p.status === 'denied' || p.status === 'rejected') stats.declined += 1;
          else if (p.status === 'interested' || p.status === 'landlord_review' || p.status === 'primary_applicant') stats.interested += 1;
          else if (isExpired && (p.status === 'push_sent' || p.status === 'pending')) stats.expired += 1;
          else if (p.status === 'push_sent' || p.status === 'pending') stats.pending += 1;
          if (!stats.last_pushed_at || new Date(p.pushed_at) > new Date(stats.last_pushed_at)) {
            stats.last_pushed_at = p.pushed_at;
          }
          pushStatsMap.set(p.tenant_id, stats);
        });
      }

      // Create a map of tenant housing status
      const housingMap = new Map<string, { is_housed: boolean; lease_end_date: string | null }>();
      (housingData || []).forEach(h => {
        housingMap.set(h.tenant_id, {
          is_housed: true,
          lease_end_date: h.lease_end_date,
        });
      });

      // Calculate the date 90 days from now
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const tenants: FinderTenant[] = (tenantData || [])
        .filter(t => t.profiles !== null)
        .map(t => {
          const profile = t.profiles as any;
          const bedroomsApproved = (t.bedrooms_approved || []).map((b: string) => parseInt(b, 10)).filter((n: number) => !isNaN(n));
          const housing = housingMap.get(t.user_id);
          
          const isHoused = housing?.is_housed || false;
          const leaseEndDate = housing?.lease_end_date || null;
          
          // Use tenant_profiles.created_at directly (matches working Queue view)
          const accountCreatedAt = t.created_at;
          const phaId = (t as any).housing_authority_id || null;
          const phaName = phaId ? (phaMap.get(phaId) || null) : ((t as any).housing_authority || null);
          
          return {
            id: t.id,
            user_id: t.user_id,
            full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
            email: profile?.email || 'N/A',
            phone: profile?.phone || 'N/A',
            city: t.city || 'N/A',
            state: t.state || null,
            zip_code: t.zip_code || 'N/A',
            bedrooms_approved: bedroomsApproved,
            rent_range_min: t.rent_range_min || 0,
            rent_range_max: t.rent_range_max || 99999,
            voucher_holder: t.voucher_holder || false,
            voucher_amount: t.voucher_amount || 0,
            monthly_income: t.monthly_income || '0',
            preferred_locations: t.preferred_locations || [],
            created_at: accountCreatedAt,
            updated_at: (t as any).updated_at || null,
            is_housed: isHoused,
            lease_end_date: leaseEndDate,
            housing_authority_id: phaId,
            housing_authority_name: phaName,
            voucher_status: (t as any).voucher_status || null,
            push_stats: pushStatsMap.get(t.user_id) || {
              total: 0, pending: 0, interested: 0, declined: 0, expired: 0, last_pushed_at: null,
            },
            ...(() => {
              const timeSpent = calculateTimeSpent(accountCreatedAt, isHoused, leaseEndDate);
              return {
                days_looking: timeSpent.days,
                hours_looking: timeSpent.hours,
              };
            })(),
          };
        })
        // Filter: only show unhoused OR lease expiring within 90 days
        .filter(t => {
          if (!t.is_housed) return true;
          if (t.lease_end_date) {
            const leaseEnd = new Date(t.lease_end_date);
            return leaseEnd <= ninetyDaysFromNow;
          }
          return false;
        });

      return tenants;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Use cached matches from computed_matches table (V2 scoring)
 * This ensures consistency with Match Command Center
 */
export const useInternalMatches = (tenant: FinderTenant | null) => {
  return useQuery({
    queryKey: ['internal-matches', tenant?.user_id],
    queryFn: async () => {
      if (!tenant?.user_id) return [];

      // Query computed_matches for this tenant, joined with property/unit data
      const { data: cachedMatches, error: cacheError } = await supabase
        .from('computed_matches')
        .select(`
          id,
          score,
          tier,
          breakdown,
          drive_time_minutes,
          drive_time_source,
          unit_id,
          property_units!inner (
            id,
            bedrooms,
            bathrooms,
            monthly_rent,
            status,
            on_market,
            unit_number,
            properties!inner (
              id,
              address,
              city,
              state,
              zipcode,
              photos,
              on_market
            )
          )
        `)
        .eq('tenant_id', tenant.user_id)
        .order('score', { ascending: false });

      if (cacheError) {
        console.warn('[useInternalMatches] Error fetching cached matches:', cacheError);
        return [];
      }

      if (!cachedMatches || cachedMatches.length === 0) {
        console.log('[useInternalMatches] No cached matches found for tenant:', tenant.user_id);
        return [];
      }

      // Transform cached matches to InternalMatch format
      const matches: InternalMatch[] = cachedMatches
        .filter((cm: any) => {
          // Only include on-market units
          const unit = cm.property_units;
          const property = unit?.properties;
          return unit?.on_market === true && 
                 property?.on_market !== false &&
                 unit?.status !== 'occupied';
        })
        .map((cm: any) => {
          const unit = cm.property_units;
          const property = unit?.properties;
          
          // Parse breakdown if it's a string
          let breakdown = cm.breakdown;
          if (typeof breakdown === 'string') {
            try {
              breakdown = JSON.parse(breakdown);
            } catch {
              breakdown = null;
            }
          }

          return {
            id: `unit-${unit.id}`,
            property_id: property.id,
            unit_id: unit.id,
            address: property.address || '',
            city: property.city || '',
            state: property.state || '',
            zip_code: property.zipcode || '',
            bedrooms: unit.bedrooms || 0,
            bathrooms: unit.bathrooms || 0,
            monthly_rent: unit.monthly_rent || 0,
            property_type: 'apartment' as const,
            status: unit.status || 'available',
            photos: property.photos || [],
            tenant_match_count: 0, // Could be computed separately if needed
            match_score: cm.score || 0,
            // V2 fields
            tier: cm.tier || null,
            drive_time_minutes: cm.drive_time_minutes,
            drive_time_source: cm.drive_time_source || null,
            breakdown: breakdown,
          };
        });

      return matches;
    },
    enabled: !!tenant?.user_id,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
};

export interface FinderPropertyUnit {
  id: string;
  unit_id: string;
  property_id: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  status: string;
  on_market: boolean;
  photos: string[] | null;
  owner_id: string;
  owner_name: string;
  client_name: string;
}

export const useFinderProperties = () => {
  return useQuery({
    queryKey: ['finder-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_number,
          bedrooms,
          bathrooms,
          monthly_rent,
          status,
          on_market,
          photos,
          property_id,
          properties!inner (
            id,
            address,
            city,
            state,
            zipcode,
            on_market,
            deleted_at,
            photos,
            owner_id,
            portfolio_id,
            profiles!properties_owner_id_fkey (
              first_name,
              last_name
            ),
            portfolios (
              client_name
            )
          )
        `)
        .is('properties.deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const units: FinderPropertyUnit[] = (data || [])
        .filter((u: any) => (u.on_market === true || u.properties.on_market === true) && u.status !== 'occupied')
        .map((u: any) => {
          const ownerProfile = u.properties.profiles as any;
          const ownerName = ownerProfile
            ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim()
            : 'Unknown';
          const portfolio = u.properties.portfolios as any;
          const clientName = portfolio?.client_name || ownerName || 'Unknown';
          return {
            id: u.id,
            unit_id: u.id,
            property_id: u.property_id,
            address: u.properties.address || '',
            city: u.properties.city || '',
            state: u.properties.state || '',
            zipcode: u.properties.zipcode || '',
            unit_number: u.unit_number || '',
            bedrooms: u.bedrooms || 0,
            bathrooms: u.bathrooms || 0,
            monthly_rent: u.monthly_rent || 0,
            status: u.status || 'available',
            on_market: u.on_market,
            photos: u.photos || u.properties.photos || null,
            owner_id: u.properties.owner_id || '',
            owner_name: ownerName,
            client_name: clientName,
          };
        });

      return units;
    },
    staleTime: 30 * 1000,
  });
};

export interface TenantMatchResult {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string | null;
  zip_code: string;
  bedrooms_approved: number[];
  rent_range_min: number;
  rent_range_max: number;
  voucher_holder: boolean;
  voucher_amount: number;
  match_score: number;
  tier: 'hot_match' | 'decent_match' | 'no_match' | null;
  drive_time_minutes: number | null;
  drive_time_source: string | null;
  breakdown: {
    location: number;
    budget: number;
    bedrooms: number;
    pets: number;
    move_in: number;
  } | null;
}

export const useInternalTenantMatches = (unitId: string | null) => {
  return useQuery({
    queryKey: ['internal-tenant-matches', unitId],
    queryFn: async () => {
      if (!unitId) return [];

      const { data: matches, error } = await supabase
        .from('computed_matches')
        .select(`
          id,
          score,
          tier,
          breakdown,
          drive_time_minutes,
          drive_time_source,
          tenant_id,
          tenant_profiles!inner (
            id,
            user_id,
            voucher_holder,
            voucher_amount,
            rent_range_min,
            rent_range_max,
            bedrooms_approved,
            city,
            state,
            zip_code,
            profiles!tenant_profiles_user_id_fkey (
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .eq('unit_id', unitId)
        .order('score', { ascending: false });

      if (error) {
        console.warn('[useInternalTenantMatches] Error:', error);
        return [];
      }

      if (!matches || matches.length === 0) return [];

      const results: TenantMatchResult[] = matches.map((cm: any) => {
        const tp = cm.tenant_profiles;
        const profile = tp?.profiles as any;
        const bedroomsApproved = (tp?.bedrooms_approved || []).map((b: string) => parseInt(b, 10)).filter((n: number) => !isNaN(n));

        let breakdown = cm.breakdown;
        if (typeof breakdown === 'string') {
          try { breakdown = JSON.parse(breakdown); } catch { breakdown = null; }
        }

        return {
          id: cm.id,
          tenant_id: cm.tenant_id,
          full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          email: profile?.email || '',
          phone: profile?.phone || '',
          city: tp?.city || '',
          state: tp?.state || null,
          zip_code: tp?.zip_code || '',
          bedrooms_approved: bedroomsApproved,
          rent_range_min: tp?.rent_range_min || 0,
          rent_range_max: tp?.rent_range_max || 99999,
          voucher_holder: tp?.voucher_holder || false,
          voucher_amount: tp?.voucher_amount || 0,
          match_score: cm.score || 0,
          tier: cm.tier || null,
          drive_time_minutes: cm.drive_time_minutes,
          drive_time_source: cm.drive_time_source || null,
          breakdown,
        };
      });

      return results;
    },
    enabled: !!unitId,
    staleTime: 60 * 1000,
  });
};

export interface ExternalSearchLink {
  platform: string;
  cityUrl: string;
  cityLabel: string;
  zipUrl: string;
  zipLabel: string;
  description: string;
  icon: string;
  hasZip: boolean;
}

export const generateExternalSearchLinks = (tenant: FinderTenant): ExternalSearchLink[] => {
  const city = tenant.city || '';
  const state = tenant.state || '';
  const zipCode = tenant.zip_code || '';
  const cityEncoded = encodeURIComponent(city);
  const stateEncoded = encodeURIComponent(state);
  const minBedrooms = Math.min(...(tenant.bedrooms_approved.length ? tenant.bedrooms_approved : [1]));
  const minRent = tenant.rent_range_min || 500;
  const maxRent = tenant.rent_range_max || 3000;
  const hasZip = !!zipCode && zipCode !== 'N/A';
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase();
  
  // Format bedroom text for search queries
  const bedroomText = `${minBedrooms} bedroom`;
  const rentText = `$${minRent.toLocaleString()}-$${maxRent.toLocaleString()}`;
  const filterDescription = `${minBedrooms}BR, ${rentText}`;

  const links: ExternalSearchLink[] = [];

  if (city && state) {
    // Trulia - with Section 8 keyword filter, beds, and rent
    links.push({
      platform: 'Trulia',
      cityUrl: `https://www.trulia.com/for_rent/${cityEncoded},${stateEncoded}/${minBedrooms}p_beds/${minRent}-${maxRent}_price/section%208_keyword/`,
      cityLabel: `${city}, ${state}`,
      zipUrl: hasZip ? `https://www.trulia.com/for_rent/${zipCode}/${minBedrooms}p_beds/${minRent}-${maxRent}_price/section%208_keyword/` : '',
      zipLabel: zipCode,
      description: filterDescription,
      icon: 'trulia',
      hasZip,
    });

    // Zillow - with beds and rent range
    links.push({
      platform: 'Zillow',
      cityUrl: `https://www.zillow.com/${citySlug}-${stateSlug}/rentals/${minBedrooms}-_beds/${minRent}-${maxRent}_price/`,
      cityLabel: `${city}, ${state}`,
      zipUrl: hasZip ? `https://www.zillow.com/homes/for_rent/${zipCode}_rb/${minBedrooms}-_beds/${minRent}-${maxRent}_price/` : '',
      zipLabel: zipCode,
      description: filterDescription,
      icon: 'zillow',
      hasZip,
    });

    // Apartments.com - with beds and rent range
    links.push({
      platform: 'Apartments.com',
      cityUrl: `https://www.apartments.com/${citySlug}-${stateSlug}/${minBedrooms}-bedrooms-${minRent}-to-${maxRent}/`,
      cityLabel: `${city}, ${state}`,
      zipUrl: hasZip ? `https://www.apartments.com/${zipCode}/${minBedrooms}-bedrooms-${minRent}-to-${maxRent}/` : '',
      zipLabel: zipCode,
      description: filterDescription,
      icon: 'apartments',
      hasZip,
    });

    // AffordableHousing.com - with beds parameter
    links.push({
      platform: 'AffordableHousing.com',
      cityUrl: `https://affordablehousing.com/list?state=${stateSlug}&city=${citySlug}&beds=${minBedrooms}`,
      cityLabel: `${city}, ${state}`,
      zipUrl: hasZip ? `https://affordablehousing.com/list?zip=${zipCode}&beds=${minBedrooms}` : '',
      zipLabel: zipCode,
      description: `${minBedrooms}BR, Section 8 housing`,
      icon: 'affordable',
      hasZip,
    });
  }

  // Google Search - with Section 8 + beds + rent in search terms
  const citySearchTerms = `section 8 voucher ${bedroomText} ${rentText} rentals ${city} ${state}`;
  const zipSearchTerms = hasZip ? `section 8 voucher ${bedroomText} ${rentText} rentals ${zipCode}` : '';
  links.push({
    platform: 'Google',
    cityUrl: `https://www.google.com/search?q=${encodeURIComponent(citySearchTerms)}`,
    cityLabel: `${city}, ${state}`,
    zipUrl: hasZip ? `https://www.google.com/search?q=${encodeURIComponent(zipSearchTerms)}` : '',
    zipLabel: zipCode,
    description: filterDescription,
    icon: 'google',
    hasZip,
  });

  return links;
};
