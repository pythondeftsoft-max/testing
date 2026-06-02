export type PropertyFilterValues = {
  search: string;
  zipcode: string;
  city: string;
  state: string;
  minRent: string;
  maxRent: string;
  bedrooms: string;
  bathrooms: string;
  propertyType: string[];
  minSquareFeet: string;
  maxSquareFeet: string;
  yearBuilt: string;
  parkingType: string[];
  petPolicy: string[];
  furnished: string;
  laundryType: string[];
  airConditioning: string;
  utilitiesIncluded: string[];
  appliancesIncluded: string[];
  moveInDate: string;
  additionalFeatures: string[];
  securityFeatures: string[];
  communityAmenities: string[];
};

export interface PropertyLike {
  id: string;
  address?: string;
  street_address?: string;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  monthly_rent?: number | null;
  desired_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

const norm = (v?: string | null) => (v ?? '').toString().trim().toLowerCase();

export function filterProperties<T extends PropertyLike>(properties: T[], filters: PropertyFilterValues): T[] {
  const z = norm(filters.zipcode);
  const c = norm(filters.city);
  const s = norm(filters.state);
  const q = norm(filters.search);

  const minRent = filters.minRent ? Number(filters.minRent) : undefined;
  const maxRent = filters.maxRent ? Number(filters.maxRent) : undefined;
  const minBeds = filters.bedrooms && filters.bedrooms !== 'any' ? Number(filters.bedrooms) : undefined;
  const minBaths = filters.bathrooms && filters.bathrooms !== 'any' ? Number(filters.bathrooms) : undefined;

  return properties.filter((p) => {
    // Search across address components
    if (q) {
      const hay = [p.address, p.street_address, p.city, p.state, p.zipcode].map(norm).join(' ');
      if (!hay.includes(q)) return false;
    }

    // Location precedence: zip > city+state > city > state
    if (z && norm(p.zipcode) !== z) return false;
    if (!z && c && s && !(norm(p.city) === c && norm(p.state) === s)) return false;
    if (!z && c && !s && norm(p.city) !== c) return false;
    if (!z && s && !c && norm(p.state) !== s) return false;

    // Rent range
    const rent = (p.monthly_rent ?? p.desired_rent ?? 0) as number;
    if (minRent !== undefined && rent < minRent) return false;
    if (maxRent !== undefined && rent > maxRent) return false;

    // Bedrooms and Bathrooms minimums
    if (minBeds !== undefined && (p.bedrooms ?? 0) < minBeds) return false;
    if (minBaths !== undefined && (p.bathrooms ?? 0) < minBaths) return false;

    return true;
  });
}
