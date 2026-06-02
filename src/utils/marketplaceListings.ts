/**
 * Marketplace Listings Transformation Utility
 * 
 * Converts property-centric data into unit-centric marketplace listings.
 * Each listing represents a rentable unit (either a single-family property or an individual unit).
 */

export interface MarketplaceListing {
  id: string; // unitId for multi-unit, propertyId for single-family
  type: 'unit' | 'property';
  parentPropertyId: string;
  
  // Unit-specific details (from unit or inherited from property)
  unitNumber?: string;
  unitName?: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  amenities: string[];
  description?: string;
  status: string;
  moveInDate?: string;
  
  // Property location data (always inherited from parent property)
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  latitude?: number;
  longitude?: number;
  
  // Property-level metadata
  photos: string[];
  propertyType?: string;
  yearBuilt?: number;
  parkingType?: string;
  petPolicy?: string;
  furnished?: boolean;
  airConditioning?: boolean;
  laundryType?: string;
  walkScore?: number;
  bikeScore?: number;
  transitScore?: number;
  ownerId: string;
  
  // Boolean amenity fields (for fallback display)
  in_unit_laundry?: boolean;
  shared_laundry?: boolean;
  laundry_hookups?: boolean;
  balcony_patio?: boolean;
  yard_garden?: boolean;
  parking_available?: boolean;
  pet_friendly?: boolean;
  dishwasher?: boolean;
  microwave?: boolean;
  refrigerator?: boolean;
  stove_oven?: boolean;
  hardwood_floors?: boolean;
  carpet?: boolean;
  tile_floors?: boolean;
  central_heating?: boolean;
  fireplace?: boolean;
  walkin_closets?: boolean;
  storage_unit?: boolean;
  gym_fitness?: boolean;
  pool?: boolean;
  security_system?: boolean;
  high_speed_internet?: boolean;
  garage_spaces?: number;
  elevator?: boolean;
  wheelchair_accessible?: boolean;
  air_conditioning?: boolean;
  
  // Market status
  onMarket: boolean;
  desiredRent?: number;
  
  // Unit count metadata (for multi-unit properties)
  totalUnitCount?: number;
  availableUnitCount?: number;
}

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_name: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  status: string;
  square_feet?: number;
  description?: string;
  unit_amenities?: string[];
  photos?: string[];
  on_market?: boolean;
  move_in_date?: string;
}

interface Property {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zipcode: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  monthly_rent?: number;
  desired_rent?: number;
  square_feet?: number;
  amenities?: string[];
  description?: string;
  photos?: string[];
  property_type?: string;
  year_built?: number;
  parking_type?: string;
  pet_policy?: string;
  furnished?: boolean;
  air_conditioning?: boolean;
  laundry_type?: string;
  walk_score?: number;
  bike_score?: number;
  transit_score?: number;
  status: string;
  owner_id: string;
  unit_count?: number;
  on_market?: boolean;
  property_units?: PropertyUnit[];
  
  // Boolean amenity fields
  in_unit_laundry?: boolean;
  shared_laundry?: boolean;
  laundry_hookups?: boolean;
  balcony_patio?: boolean;
  yard_garden?: boolean;
  parking_available?: boolean;
  pet_friendly?: boolean;
  dishwasher?: boolean;
  microwave?: boolean;
  refrigerator?: boolean;
  stove_oven?: boolean;
  hardwood_floors?: boolean;
  carpet?: boolean;
  tile_floors?: boolean;
  central_heating?: boolean;
  fireplace?: boolean;
  walkin_closets?: boolean;
  storage_unit?: boolean;
  gym_fitness?: boolean;
  pool?: boolean;
  security_system?: boolean;
  high_speed_internet?: boolean;
  garage_spaces?: number;
  elevator?: boolean;
  wheelchair_accessible?: boolean;
}

/**
 * Transform properties into unit-centric marketplace listings.
 * 
 * Logic:
 * - Single-family (unit_count = 1 or no units): Create one listing from property data
 * - Multi-unit: Create one listing per on-market unit
 * 
 * Each listing includes unit-specific details with inherited property location.
 */
export function transformPropertiesToListings(properties: Property[]): MarketplaceListing[] {
  const listings: MarketplaceListing[] = [];
  
  for (const property of properties) {
    // Determine if single-family based on unit_count, not just presence of units array
    const isSingleFamily = !property.unit_count || property.unit_count === 1;
    
    // Build base address from property - always include city, state, zip
    const baseAddress = property.address || property.street_address || '';
    const fullAddress = `${baseAddress}${property.city ? ', ' + property.city : ''}${property.state ? ', ' + property.state : ''}${property.zipcode ? ' ' + property.zipcode : ''}`.trim();
    
    if (isSingleFamily) {
      // Single-family property: Create one listing from property data
      // Only include if property.on_market is true
      if (property.on_market === true) {
        listings.push({
          id: property.id,
          type: 'property',
          parentPropertyId: property.id,
          
          // Unit details from property
          rent: property.desired_rent || property.monthly_rent || 0,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.square_feet,
          amenities: property.amenities || [],
          description: property.description,
          status: property.status,
          
          // Property location
          address: fullAddress,
          streetAddress: property.street_address,
          city: property.city,
          state: property.state,
          zipcode: property.zipcode,
          latitude: property.latitude,
          longitude: property.longitude,
          
          // Property metadata
          photos: property.photos || [],
          propertyType: property.property_type,
          yearBuilt: property.year_built,
          parkingType: property.parking_type,
          petPolicy: property.pet_policy,
          furnished: property.furnished,
          airConditioning: property.air_conditioning,
          laundryType: property.laundry_type,
          walkScore: property.walk_score,
          bikeScore: property.bike_score,
          transitScore: property.transit_score,
          ownerId: property.owner_id,
          
          // Market status
          onMarket: true,
          desiredRent: property.desired_rent,
          
          // Boolean amenity fields for fallback
          in_unit_laundry: property.in_unit_laundry,
          shared_laundry: property.shared_laundry,
          laundry_hookups: property.laundry_hookups,
          balcony_patio: property.balcony_patio,
          yard_garden: property.yard_garden,
          parking_available: property.parking_available,
          pet_friendly: property.pet_friendly,
          dishwasher: property.dishwasher,
          microwave: property.microwave,
          refrigerator: property.refrigerator,
          stove_oven: property.stove_oven,
          hardwood_floors: property.hardwood_floors,
          carpet: property.carpet,
          tile_floors: property.tile_floors,
          central_heating: property.central_heating,
          fireplace: property.fireplace,
          walkin_closets: property.walkin_closets,
          storage_unit: property.storage_unit,
          gym_fitness: property.gym_fitness,
          pool: property.pool,
          security_system: property.security_system,
          high_speed_internet: property.high_speed_internet,
          garage_spaces: property.garage_spaces,
          elevator: property.elevator,
          wheelchair_accessible: property.wheelchair_accessible,
          air_conditioning: property.air_conditioning,
        });
      }
    } else {
      // Multi-unit property: Create listing for each on-market unit
      const onMarketUnits = property.property_units?.filter(unit => unit.on_market === true) || [];
      const availableCount = onMarketUnits.length;
      
      for (const unit of onMarketUnits) {
        // Debug logging for photos and amenities
        console.log('📸 Unit transformation:', {
          unitId: unit.id,
          unitPhotos: unit.photos?.length || 0,
          propertyPhotos: property.photos?.length || 0,
          unitAmenities: unit.unit_amenities?.length || 0,
          propertyAmenities: property.amenities?.length || 0
        });
        
        listings.push({
          id: unit.id,
          type: 'unit',
          parentPropertyId: property.id,
          
          // Unit-specific details
          unitNumber: unit.unit_number,
          unitName: unit.unit_name,
          rent: unit.monthly_rent || property.monthly_rent || 0,
          bedrooms: unit.bedrooms || property.bedrooms,
          bathrooms: unit.bathrooms || property.bathrooms,
          squareFeet: unit.square_feet || property.square_feet,
          amenities: (unit.unit_amenities && unit.unit_amenities.length > 0) 
            ? unit.unit_amenities 
            : (property.amenities || []),
          description: unit.description || property.description,
          status: unit.status,
          moveInDate: unit.move_in_date,
          
          // Property location (inherited)
          address: fullAddress,
          streetAddress: property.street_address,
          city: property.city,
          state: property.state,
          zipcode: property.zipcode,
          latitude: property.latitude,
          longitude: property.longitude,
          
          // Property metadata (inherited)
          photos: unit.photos || property.photos || [],
          propertyType: property.property_type,
          yearBuilt: property.year_built,
          parkingType: property.parking_type,
          petPolicy: property.pet_policy,
          furnished: property.furnished,
          airConditioning: property.air_conditioning,
          laundryType: property.laundry_type,
          walkScore: property.walk_score,
          bikeScore: property.bike_score,
          transitScore: property.transit_score,
          ownerId: property.owner_id,
          
          // Market status
          onMarket: true,
          desiredRent: property.desired_rent,
          
          // Unit count metadata
          totalUnitCount: property.unit_count,
          availableUnitCount: availableCount,
          
          // Boolean amenity fields for fallback (inherited from property)
          in_unit_laundry: property.in_unit_laundry,
          shared_laundry: property.shared_laundry,
          laundry_hookups: property.laundry_hookups,
          balcony_patio: property.balcony_patio,
          yard_garden: property.yard_garden,
          parking_available: property.parking_available,
          pet_friendly: property.pet_friendly,
          dishwasher: property.dishwasher,
          microwave: property.microwave,
          refrigerator: property.refrigerator,
          stove_oven: property.stove_oven,
          hardwood_floors: property.hardwood_floors,
          carpet: property.carpet,
          tile_floors: property.tile_floors,
          central_heating: property.central_heating,
          fireplace: property.fireplace,
          walkin_closets: property.walkin_closets,
          storage_unit: property.storage_unit,
          gym_fitness: property.gym_fitness,
          pool: property.pool,
          security_system: property.security_system,
          high_speed_internet: property.high_speed_internet,
          garage_spaces: property.garage_spaces,
          elevator: property.elevator,
          wheelchair_accessible: property.wheelchair_accessible,
          air_conditioning: property.air_conditioning,
        });
      }
    }
  }
  
  return listings;
}
