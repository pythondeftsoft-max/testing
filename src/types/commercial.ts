
export type CommercialPropertyType = 
  | 'office'
  | 'retail'
  | 'warehouse'
  | 'industrial'
  | 'hospitality'
  | 'specialty'
  | 'mixed_use';

export type CommercialSubType = 
  // Office
  | 'office_building'
  | 'medical'
  | 'coworking_space'
  | 'call_center'
  | 'government_office'
  // Retail
  | 'shopping_center'
  | 'restaurant'
  | 'strip_mall'
  | 'convenience_store'
  | 'gas_station'
  | 'car_dealership'
  // Warehouse
  | 'warehouse_distribution'
  | 'self_storage'
  | 'cold_storage'
  | 'truck_terminal'
  | 'fulfillment_center'
  // Industrial
  | 'manufacturing'
  | 'flex_space'
  | 'data_center'
  | 'recycling_facility'
  | 'food_processing'
  // Hospitality
  | 'hotel'
  | 'motel'
  | 'resort'
  | 'bed_and_breakfast'
  | 'casino'
  | 'event_venue'
  // Specialty
  | 'golf_course'
  | 'marina'
  | 'prison'
  | 'campground'
  | 'car_wash'
  | 'senior_living'
  | 'sports_facility'
  | 'vineyard'
  | 'solar_farm'
  | 'cell_tower'
  // Mixed Use
  | 'mixed_retail_office'
  | 'live_work';

export interface CommercialPropertyData {
  // Required fields
  property_type: 'commercial';
  commercial_type: CommercialPropertyType;
  
  // International address support
  country?: string;
  international_address?: {
    street_1?: string;
    street_2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    district?: string;
    region?: string;
  };
  
  // Legacy US fields (kept for backward compatibility)
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  
  // Optional basic fields
  commercial_subtype?: CommercialSubType;
  asset_tags: string[];
  source_badge?: 'manual' | 'parsed' | 'integration' | 'import';
  asset_category?: 'real_estate' | 'business_holding' | 'crypto' | 'stocks' | 'vehicle' | 'other';
  selectedPortfolio?: string; // Portfolio selection for "everything" view
  
  // Commercial-specific fields
  total_square_footage?: number;
  leasable_square_footage?: number;
  occupancy_rate?: number;
  base_rent_psf?: number;
  cam_charges?: number;
  tax_rate_psf?: number;
  insurance_rate_psf?: number;
  
  // Multi-tenant support
  is_multi_tenant: boolean;
  tenant_count?: number;
  
  // Lease structure
  lease_type?: 'gross' | 'net' | 'modified_gross' | 'triple_net';
  cam_recoverable?: boolean;
  
  // Specialty fields
  is_owner_operated?: boolean;
  linked_business_holding_id?: string;
  
  // Images
  images?: string[];
  
  // Optional metadata
  description?: string;
  notes?: string;
}
