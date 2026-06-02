/**
 * Programmatic City SEO Generator
 *
 * Pulls housing_authorities + active properties to build city-specific
 * /section-8-housing/{citySlug} pages. Targets the highest-volume
 * "Section 8 housing in {city}" search queries.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CityPHA {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  zipcode: string | null;
  public_waitlist_open: boolean | null;
}

export interface CityPropertyCard {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number | null;
  property_type: string | null;
}

export interface CityPageData {
  citySlug: string;
  cityName: string;
  state: string;
  primaryPHA: CityPHA | null;
  allPHAs: CityPHA[];
  unitCount: number;
  units: CityPropertyCard[];
  nearbyCities: { slug: string; name: string; state: string }[];
}

export const slugifyCity = (city: string, state: string): string => {
  const c = (city || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const s = (state || '').toLowerCase().trim();
  return `${c}-${s}`;
};

export const parseCitySlug = (slug: string): { city: string; state: string } | null => {
  if (!slug) return null;
  const parts = slug.split('-');
  if (parts.length < 2) return null;
  const state = parts[parts.length - 1].toUpperCase();
  const city = parts.slice(0, -1).join(' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return { city, state };
};

/**
 * Fetch the top voucher cities ranked by # of housing authorities (proxy for voucher volume).
 * Used by /section-8-housing index page.
 */
export const fetchTopCities = async (limit = 100) => {
  const { data, error } = await supabase
    .from('housing_authorities')
    .select('city, state')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .eq('is_active', true)
    .limit(5000);

  if (error) throw error;

  const counts = new Map<string, { city: string; state: string; count: number }>();
  for (const row of data || []) {
    const key = `${row.city}|${row.state}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { city: row.city as string, state: row.state as string, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => ({
      ...c,
      slug: slugifyCity(c.city, c.state),
    }));
};

/**
 * Build the full data payload for a single city page.
 */
export const fetchCityPageData = async (citySlug: string): Promise<CityPageData | null> => {
  const parsed = parseCitySlug(citySlug);
  if (!parsed) return null;
  const { city, state } = parsed;

  // PHAs in the city (case-insensitive match)
  const { data: phas } = await supabase
    .from('housing_authorities')
    .select('id, name, city, state, website, address, zipcode, public_waitlist_open')
    .ilike('city', city)
    .ilike('state', state)
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Active platform units in the city
  const { data: units, count } = await supabase
    .from('properties')
    .select('id, address, city, state, zipcode, bedrooms, bathrooms, monthly_rent, property_type', { count: 'exact' })
    .ilike('city', city)
    .ilike('state', state)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  // Nearby cities = other top cities in the same state
  const { data: nearbyData } = await supabase
    .from('housing_authorities')
    .select('city, state')
    .ilike('state', state)
    .not('city', 'is', null)
    .neq('city', city)
    .eq('is_active', true)
    .limit(500);

  const nearbyMap = new Map<string, { city: string; state: string; count: number }>();
  for (const row of nearbyData || []) {
    const key = `${row.city}|${row.state}`;
    const existing = nearbyMap.get(key);
    if (existing) existing.count += 1;
    else nearbyMap.set(key, { city: row.city as string, state: row.state as string, count: 1 });
  }
  const nearbyCities = Array.from(nearbyMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => ({ slug: slugifyCity(c.city, c.state), name: c.city, state: c.state }));

  return {
    citySlug,
    cityName: city,
    state,
    primaryPHA: (phas?.[0] as CityPHA) || null,
    allPHAs: (phas as CityPHA[]) || [],
    unitCount: count || 0,
    units: (units as CityPropertyCard[]) || [],
    nearbyCities,
  };
};
