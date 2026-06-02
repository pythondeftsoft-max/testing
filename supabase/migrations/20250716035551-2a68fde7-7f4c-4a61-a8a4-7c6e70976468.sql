-- Drop all existing tenant type constraints
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS check_default_tenant_type;
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_tenant_type_check;

-- Update all values to use consistent naming: 'voucher' and 'market_rate'
UPDATE public.properties 
SET default_tenant_type = 'market_rate' 
WHERE default_tenant_type IN ('market', 'not_specified') OR default_tenant_type IS NULL;

-- Add the correct constraint
ALTER TABLE public.properties
ADD CONSTRAINT properties_tenant_type_check 
CHECK (default_tenant_type IN ('voucher', 'market_rate'));

-- Do the same for property_units
ALTER TABLE public.property_units DROP CONSTRAINT IF EXISTS property_units_tenant_type_check;

UPDATE public.property_units 
SET tenant_type = 'market_rate' 
WHERE tenant_type IN ('market', 'not_specified') OR tenant_type IS NULL;

ALTER TABLE public.property_units
ADD CONSTRAINT property_units_tenant_type_check 
CHECK (tenant_type IN ('voucher', 'market_rate'));