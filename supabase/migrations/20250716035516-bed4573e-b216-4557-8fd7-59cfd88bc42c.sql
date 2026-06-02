-- First update the values to conform to the constraint
UPDATE public.properties 
SET default_tenant_type = 'market_rate' 
WHERE default_tenant_type = 'not_specified';

-- Update any NULL values as well
UPDATE public.properties 
SET default_tenant_type = 'market_rate' 
WHERE default_tenant_type IS NULL;

-- Now we can safely add the constraint
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_tenant_type_check;
ALTER TABLE public.properties
ADD CONSTRAINT properties_tenant_type_check 
CHECK (default_tenant_type IN ('voucher', 'market_rate'));

-- Do the same for property_units if needed
UPDATE public.property_units 
SET tenant_type = 'market_rate' 
WHERE tenant_type IS NULL OR tenant_type NOT IN ('voucher', 'market_rate');

-- Add constraint for property_units
ALTER TABLE public.property_units DROP CONSTRAINT IF EXISTS property_units_tenant_type_check;
ALTER TABLE public.property_units
ADD CONSTRAINT property_units_tenant_type_check 
CHECK (tenant_type IN ('voucher', 'market_rate'));