// Direct API call with extended timeout for scraping
// Bypasses the global 30s timeout in the supabase client

const SUPABASE_URL = "https://kixsdhnfzjnxikmnbipi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4";

export interface ScrapedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ScrapedPetPolicy {
  allowed: boolean;
  deposit: number | null;
  monthlyFee: number | null;
  restrictions: string;
}

export interface ScrapedContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface ScrapedPropertyData {
  address: ScrapedAddress;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  description: string;
  propertyType: 'house' | 'apartment' | 'townhouse' | 'mobile_home';
  amenities: string[]; // Mapped to our system keys
  rawAmenities: string[]; // Original scraped amenities
  petPolicy: ScrapedPetPolicy;
  images: string[];
  yearBuilt: number | null;
  utilitiesIncluded: string[];
  availableDate: string | null;
  contactInfo: ScrapedContactInfo;
  sourceUrl: string;
  scrapedAt: string;
  pageTitle: string;
  rawMarkdown: string;
}

interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: ScrapedPropertyData;
}

export const propertyScraperApi = {
  /**
   * Scrape a property listing URL and extract structured data
   * Uses direct fetch with 120s timeout to handle slow real estate sites
   * @param url - The URL of the property listing (Trulia, Zillow, Apartments.com, etc.)
   * @returns Structured property data ready for import
   */
  async scrapeListingUrl(url: string): Promise<ScrapeResponse> {
    try {
      // Use direct fetch with extended timeout (120 seconds)
      // This bypasses the global 30s timeout in supabase client
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/scrape-property-listing`,
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
        console.error('Scraper API error:', data);
        // Provide helpful error messages for common issues
        let errorMessage = data.error || `Request failed with status ${response.status}`;
        if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
          errorMessage = 'This listing took too long to load. Try a different link (Trulia often works better than Zillow), or enter details manually.';
        }
        return { success: false, error: errorMessage };
      }
      
      if (!data.success) {
        let errorMessage = data.error || 'Scraping failed';
        if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT') || data.code === 'SCRAPE_TIMEOUT') {
          errorMessage = 'This listing took too long to load. Try a different link or enter property details manually.';
        }
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        data: data.data as ScrapedPropertyData,
      };
    } catch (err) {
      console.error('Error calling property scraper:', err);
      
      // Handle abort/timeout specifically
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The listing site may be slow - try again or enter details manually.',
        };
      }
      
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      };
    }
  },
};
