-- Phase 1: Commercial Property Extension
-- First, add 'commercial' to existing property_type enum
ALTER TYPE property_type ADD VALUE 'commercial';

-- Create enums for commercial properties and asset sources
CREATE TYPE commercial_property_type AS ENUM (
  'office',
  'retail', 
  'warehouse',
  'industrial',
  'hospitality',
  'specialty',
  'mixed_use'
);

-- Commercial subtype enum
CREATE TYPE commercial_subtype AS ENUM (
  'restaurant',
  'hotel',
  'motel',
  'golf_course',
  'marina',
  'prison',
  'self_storage',
  'medical',
  'shopping_center',
  'office_building',
  'warehouse_distribution',
  'manufacturing',
  'flex_space'
);

-- Asset source type enum
CREATE TYPE asset_source_type AS ENUM (
  'manual',
  'parsed',
  'integration',
  'import'
);

-- Asset category enum for future portfolio assets
CREATE TYPE asset_category AS ENUM (
  'real_estate',
  'business_holding',
  'crypto',
  'stocks',
  'vehicle',
  'other'
);

-- Lease type enum
CREATE TYPE lease_type AS ENUM (
  'gross',
  'net',
  'modified_gross',
  'triple_net'
);

-- Extend properties table with commercial fields
ALTER TABLE public.properties 
ADD COLUMN commercial_type commercial_property_type,
ADD COLUMN commercial_subtype commercial_subtype,
ADD COLUMN asset_tags TEXT[] DEFAULT '{}',
ADD COLUMN source_badge asset_source_type DEFAULT 'manual',
ADD COLUMN is_multi_tenant BOOLEAN DEFAULT false,
ADD COLUMN tenant_count INTEGER DEFAULT 0,
ADD COLUMN occupancy_rate NUMERIC(5,2) DEFAULT 0,

-- Commercial-specific financial fields
ADD COLUMN total_square_footage NUMERIC(10,2),
ADD COLUMN leasable_square_footage NUMERIC(10,2),
ADD COLUMN base_rent_psf NUMERIC(8,2),
ADD COLUMN cam_charges NUMERIC(10,2) DEFAULT 0,
ADD COLUMN tax_rate_psf NUMERIC(8,2) DEFAULT 0,
ADD COLUMN insurance_rate_psf NUMERIC(8,2) DEFAULT 0,

-- Lease structure fields
ADD COLUMN lease_type lease_type,
ADD COLUMN cam_recoverable BOOLEAN DEFAULT false,

-- Business operation linkage
ADD COLUMN is_owner_operated BOOLEAN DEFAULT false,
ADD COLUMN linked_business_holding_id UUID,

-- Asset categorization
ADD COLUMN asset_category asset_category DEFAULT 'real_estate';

-- Add constraint to ensure commercial properties have commercial_type
ALTER TABLE public.properties 
ADD CONSTRAINT check_commercial_type_consistency 
CHECK (
  (property_type != 'commercial' OR commercial_type IS NOT NULL)
);

-- Add constraint for occupancy rate validation
ALTER TABLE public.properties 
ADD CONSTRAINT check_occupancy_rate_valid 
CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100);

-- Add constraint for square footage validation
ALTER TABLE public.properties 
ADD CONSTRAINT check_square_footage_valid 
CHECK (
  total_square_footage IS NULL OR 
  leasable_square_footage IS NULL OR 
  leasable_square_footage <= total_square_footage
);

-- Create indexes for performance
CREATE INDEX idx_properties_commercial_type ON public.properties(commercial_type) WHERE commercial_type IS NOT NULL;
CREATE INDEX idx_properties_source_badge ON public.properties(source_badge);
CREATE INDEX idx_properties_asset_category ON public.properties(asset_category);
CREATE INDEX idx_properties_is_multi_tenant ON public.properties(is_multi_tenant) WHERE is_multi_tenant = true;
CREATE INDEX idx_properties_asset_tags ON public.properties USING GIN(asset_tags);

-- Create partial index for commercial properties
CREATE INDEX idx_commercial_properties_active ON public.properties(commercial_type, commercial_subtype, occupancy_rate) 
WHERE property_type = 'commercial' AND status != 'deleted' AND deleted_at IS NULL;

-- Update trigger to calculate monthly rent for commercial properties
CREATE OR REPLACE FUNCTION calculate_commercial_monthly_rent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for commercial properties with square footage
  IF NEW.property_type = 'commercial' AND NEW.leasable_square_footage IS NOT NULL AND NEW.base_rent_psf IS NOT NULL THEN
    NEW.monthly_rent := (NEW.base_rent_psf * NEW.leasable_square_footage) / 12;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commercial_monthly_rent
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commercial_monthly_rent();

-- Add comments for documentation
COMMENT ON COLUMN public.properties.commercial_type IS 'Type of commercial property (office, retail, etc.)';
COMMENT ON COLUMN public.properties.commercial_subtype IS 'Specific subtype of commercial property';
COMMENT ON COLUMN public.properties.asset_tags IS 'Tags for categorizing and filtering assets';
COMMENT ON COLUMN public.properties.source_badge IS 'How this property was added to the system';
COMMENT ON COLUMN public.properties.is_multi_tenant IS 'Whether this property has multiple tenants';
COMMENT ON COLUMN public.properties.total_square_footage IS 'Total building square footage';
COMMENT ON COLUMN public.properties.leasable_square_footage IS 'Leasable square footage';
COMMENT ON COLUMN public.properties.base_rent_psf IS 'Base rent per square foot annually';
COMMENT ON COLUMN public.properties.cam_charges IS 'Common Area Maintenance charges';
COMMENT ON COLUMN public.properties.lease_type IS 'Type of lease structure (gross, net, etc.)';
COMMENT ON COLUMN public.properties.linked_business_holding_id IS 'Reference to associated business holding';
COMMENT ON COLUMN public.properties.asset_category IS 'High-level asset category for portfolio management';