// Single source of truth for all amenities across the application
// Used by properties, units, and all amenity displays/forms

export interface AmenityItem {
  key: string;
  label: string;
  category: string;
}

export const AMENITIES_LIST: AmenityItem[] = [
  // General Amenities
  { key: 'air_conditioning', label: 'Air Conditioning', category: 'General' },
  { key: 'heating', label: 'Heating', category: 'General' },
  { key: 'furnished', label: 'Furnished', category: 'General' },
  { key: 'balcony_patio', label: 'Balcony/Patio', category: 'General' },
  { key: 'yard_garden', label: 'Yard/Garden', category: 'General' },
  { key: 'fireplace', label: 'Fireplace', category: 'General' },
  { key: 'walk_in_closets', label: 'Walk-in Closets', category: 'General' },
  { key: 'ceiling_fans', label: 'Ceiling Fans', category: 'General' },
  { key: 'cable_ready', label: 'Cable Ready', category: 'General' },
  { key: 'high_speed_internet', label: 'High Speed Internet', category: 'General' },

  // Appliances
  { key: 'dishwasher', label: 'Dishwasher', category: 'Appliances' },
  { key: 'microwave', label: 'Microwave', category: 'Appliances' },
  { key: 'refrigerator', label: 'Refrigerator', category: 'Appliances' },
  { key: 'stove_oven', label: 'Stove/Oven', category: 'Appliances' },
  { key: 'garbage_disposal', label: 'Garbage Disposal', category: 'Appliances' },

  // Laundry
  { key: 'in_unit_laundry', label: 'In-Unit Laundry', category: 'Laundry' },
  { key: 'shared_laundry', label: 'Shared Laundry', category: 'Laundry' },
  { key: 'laundry_hookups', label: 'Laundry Hookups', category: 'Laundry' },
  { key: 'washer', label: 'Washer', category: 'Laundry' },
  { key: 'dryer', label: 'Dryer', category: 'Laundry' },

  // Flooring
  { key: 'hardwood_floors', label: 'Hardwood Floors', category: 'Flooring' },
  { key: 'carpet', label: 'Carpet', category: 'Flooring' },
  { key: 'tile_floors', label: 'Tile Floors', category: 'Flooring' },

  // Parking
  { key: 'parking', label: 'Parking Available', category: 'Parking' },
  { key: 'garage', label: 'Garage', category: 'Parking' },
  { key: 'parking_space', label: 'Parking Space', category: 'Parking' },

  // Community
  { key: 'gym_fitness', label: 'Gym/Fitness Center', category: 'Community' },
  { key: 'pool', label: 'Pool', category: 'Community' },
  { key: 'storage_unit', label: 'Storage Unit', category: 'Community' },
  { key: 'elevator', label: 'Elevator', category: 'Community' },

  // Security
  { key: 'security_system', label: 'Security System', category: 'Security' },

  // Accessibility
  { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', category: 'Accessibility' },

  // Policies
  { key: 'pet_friendly', label: 'Pet Friendly', category: 'Policies' },
  { key: 'smoking_allowed', label: 'Smoking Allowed', category: 'Policies' },
];

// Group amenities by category
export const AMENITIES_BY_CATEGORY = AMENITIES_LIST.reduce((acc, amenity) => {
  if (!acc[amenity.category]) {
    acc[amenity.category] = [];
  }
  acc[amenity.category].push(amenity);
  return acc;
}, {} as Record<string, AmenityItem[]>);

// Category order for display
export const AMENITY_CATEGORIES = [
  'General',
  'Appliances',
  'Laundry',
  'Flooring',
  'Parking',
  'Community',
  'Security',
  'Accessibility',
  'Policies',
];
