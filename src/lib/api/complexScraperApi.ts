// Direct API call with extended timeout for scraping apartment complexes
// Bypasses the global 30s timeout in the supabase client

const SUPABASE_URL = "https://kixsdhnfzjnxikmnbipi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4";

export interface ScrapedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ScrapedFloorPlan {
  name: string;
  bedrooms: number;
  bathrooms: number;
  sqft_min: number | null;
  sqft_max: number | null;
  rent_min: number | null;
  rent_max: number | null;
  availability: string | null;
  deposit: number | null;
  available_units: number | null;
  photos: string[];
}

export interface ScrapedPetPolicy {
  allowed: boolean | null;
  deposit: number | null;
  monthly_fee: number | null;
  restrictions: string;
}

export interface ScrapedContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface ScrapedParking {
  type: string;
  cost: number | null;
  details: string;
}

export interface ScrapedComplex {
  property_name: string;
  address: ScrapedAddress;
  description: string;
  year_built: number | null;
  total_units: number | null;
  stories: number | null;
  community_amenities: string[];
  unit_amenities: string[];
  pet_policy: ScrapedPetPolicy;
  contact_info: ScrapedContactInfo;
  photos: string[];
  floor_plans: ScrapedFloorPlan[];
  utilities_included: string[];
  parking: ScrapedParking;
  lease_terms: string[];
  neighborhood: string;
  walk_score: number | null;
  transit_score: number | null;
  source_url: string;
  scraped_at: string;
  raw_markdown: string;
  pages_scraped?: string[];
  photo_stats?: { raw: number; unique: number };
}

interface ScrapeComplexResponse {
  success: boolean;
  error?: string;
  data?: ScrapedComplex;
}

export const complexScraperApi = {
  async scrapeComplexUrl(url: string): Promise<ScrapeComplexResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/scrape-apartment-complex`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timeoutId));

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || `Request failed with status ${response.status}` };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Scraping failed' };
      }

      return { success: true, data: data.data as ScrapedComplex };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request timed out. The listing site may be slow — try again.' };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },
};
