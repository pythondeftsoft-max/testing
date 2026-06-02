export interface GroupedProperty {
  id: string;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  latitude: number;
  longitude: number;
  
  // Multi-unit specific fields
  isMultiUnit: boolean;
  availableUnitCount: number;
  minRent: number;
  maxRent: number;
  
  // Keep original for single-family
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent: number;
  
  // Metadata
  status: string;
  photos?: string[];
  amenities?: string[];
  owner_id: string;
  unit_count: number;
  square_feet?: number;
  
  // Store all unit listings for this property
  unitListings?: any[];
  
  // Preserve other fields that might be needed
  [key: string]: any;
}

export function groupListingsByProperty(listings: any[]): GroupedProperty[] {
  // Group by address (primary grouping key)
  const groups = new Map<string, any[]>();
  
  listings.forEach(listing => {
    const key = `${listing.street_address || listing.address}_${listing.city}_${listing.state}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(listing);
  });
  
  // Transform groups into GroupedProperty objects
  const grouped: GroupedProperty[] = [];
  
  groups.forEach((units) => {
    const isMultiUnit = units.length > 1;
    
    if (isMultiUnit) {
      // Sort units by price (cheapest first)
      const sortedUnits = units.sort((a, b) => {
        const rentA = a.rent || a.monthly_rent || 0;
        const rentB = b.rent || b.monthly_rent || 0;
        return rentA - rentB;
      });
      
      // Multi-unit: calculate range
      const rents = sortedUnits.map(u => u.rent || u.monthly_rent || 0).filter(r => r > 0);
      const minRent = rents.length > 0 ? Math.min(...rents) : 0;
      const maxRent = rents.length > 0 ? Math.max(...rents) : 0;
      
      grouped.push({
        ...sortedUnits[0], // Use cheapest unit as base
        isMultiUnit: true,
        availableUnitCount: sortedUnits.length,
        minRent,
        maxRent,
        monthly_rent: minRent, // Set monthly_rent to minRent for compatibility
        unitListings: sortedUnits, // Store sorted units
      });
    } else {
      // Single-family: keep as is
      grouped.push({
        ...units[0],
        isMultiUnit: false,
        availableUnitCount: 1,
        monthly_rent: units[0].rent || units[0].monthly_rent || 0,
        minRent: units[0].rent || units[0].monthly_rent || 0,
        maxRent: units[0].rent || units[0].monthly_rent || 0,
      });
    }
  });
  
  return grouped;
}
