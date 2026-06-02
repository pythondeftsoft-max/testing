
-- Phase 1: Database Schema Cleanup and Data Migration
-- First, let's migrate any existing property-level data from property_units back to properties table

-- Update properties table with any missing data from property_units (for single-unit properties)
UPDATE properties 
SET 
  insurance_cost = COALESCE(properties.insurance_cost, pu.monthly_insurance),
  property_taxes = COALESCE(properties.property_taxes, pu.property_taxes)
FROM property_units pu 
WHERE properties.id = pu.property_id 
  AND properties.unit_count = 1
  AND (properties.insurance_cost IS NULL OR properties.property_taxes IS NULL);

-- Remove duplicated property-level fields from property_units table
ALTER TABLE property_units DROP COLUMN IF EXISTS monthly_insurance;
ALTER TABLE property_units DROP COLUMN IF EXISTS property_taxes;

-- Add any missing unit-specific financial fields if they don't exist
ALTER TABLE property_units 
ADD COLUMN IF NOT EXISTS utility_costs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_costs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_allocation numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_tax_allocation numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS management_fee_allocation numeric DEFAULT 0;

-- Ensure all single-unit properties have a corresponding property_units record
INSERT INTO property_units (
  property_id, 
  unit_number, 
  unit_name, 
  monthly_rent, 
  bedrooms, 
  bathrooms, 
  square_feet, 
  status,
  security_deposit_amount
)
SELECT 
  p.id,
  '1' as unit_number,
  'Unit 1' as unit_name,
  p.monthly_rent,
  p.bedrooms,
  p.bathrooms,
  p.square_feet,
  p.status,
  p.security_deposit_amount
FROM properties p
LEFT JOIN property_units pu ON p.id = pu.property_id
WHERE p.unit_count = 1 
  AND pu.id IS NULL
  AND p.deleted_at IS NULL;
