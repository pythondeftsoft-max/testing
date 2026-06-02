-- Update tenant type values to be more standardized
-- Change 'not_specified' to 'market' for consistency
UPDATE public.properties 
SET default_tenant_type = 'market_rate' 
WHERE default_tenant_type = 'not_specified' OR default_tenant_type IS NULL;

-- Update property_units table as well if needed
UPDATE public.property_units 
SET tenant_type = 'market_rate' 
WHERE tenant_type = 'not_specified' OR tenant_type IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.properties.default_tenant_type IS 'Default tenant type for this property: voucher or market_rate';
COMMENT ON COLUMN public.property_units.tenant_type IS 'Tenant type for this specific unit: voucher or market_rate';