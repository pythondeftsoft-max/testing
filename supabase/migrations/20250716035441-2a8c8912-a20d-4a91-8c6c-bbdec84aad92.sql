-- First let's see what values currently exist and fix the constraint
-- Update the existing constraint to allow the standardized values
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS check_default_tenant_type;
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_tenant_type_check;

-- Add the updated constraint with proper values
ALTER TABLE public.properties
ADD CONSTRAINT properties_tenant_type_check 
CHECK (default_tenant_type IN ('voucher', 'market_rate'));

-- Now update any existing values to the standard ones
UPDATE public.properties 
SET default_tenant_type = 'market_rate' 
WHERE default_tenant_type NOT IN ('voucher', 'market_rate') OR default_tenant_type IS NULL;

-- Do the same for property_units table
ALTER TABLE public.property_units DROP CONSTRAINT IF EXISTS property_units_tenant_type_check;
ALTER TABLE public.property_units
ADD CONSTRAINT property_units_tenant_type_check 
CHECK (tenant_type IN ('voucher', 'market_rate'));

UPDATE public.property_units 
SET tenant_type = 'market_rate' 
WHERE tenant_type NOT IN ('voucher', 'market_rate') OR tenant_type IS NULL;