
-- Add default_tenant_type column to properties table
ALTER TABLE public.properties 
ADD COLUMN default_tenant_type text DEFAULT 'voucher';

-- Add tenant_type column to property_units table  
ALTER TABLE public.property_units
ADD COLUMN tenant_type text DEFAULT 'voucher';

-- Add check constraints to ensure valid tenant types
ALTER TABLE public.properties
ADD CONSTRAINT properties_tenant_type_check 
CHECK (default_tenant_type IN ('voucher', 'market_rate'));

ALTER TABLE public.property_units
ADD CONSTRAINT property_units_tenant_type_check 
CHECK (tenant_type IN ('voucher', 'market_rate'));

-- Update tenant_invitations table to include tenant_type if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_invitations' 
    AND column_name = 'tenant_type'
  ) THEN
    ALTER TABLE public.tenant_invitations 
    ADD COLUMN tenant_type text DEFAULT 'voucher';
    
    ALTER TABLE public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_tenant_type_check 
    CHECK (tenant_type IN ('voucher', 'market_rate'));
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN public.properties.default_tenant_type IS 'Default tenant type for this property: voucher or market_rate';
COMMENT ON COLUMN public.property_units.tenant_type IS 'Tenant type for this specific unit: voucher or market_rate';
