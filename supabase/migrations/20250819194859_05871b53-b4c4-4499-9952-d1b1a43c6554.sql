
-- Add tenant_marketplace_mode to user_preferences to control marketplace access logic
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS tenant_marketplace_mode text DEFAULT 'section8' CHECK (tenant_marketplace_mode IN ('section8', 'mixed'));

-- Add business_phase to enterprise_settings to control global marketplace behavior
INSERT INTO public.enterprise_settings (id, setting_key, setting_value, description)
VALUES (
  gen_random_uuid(),
  'business_phase',
  '"section8"'::jsonb,
  'Current business phase: section8 (voucher focus) or mixed (cash + voucher)'
) ON CONFLICT (setting_key) DO NOTHING;

-- Add marine property type support
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'marine';

-- Add tenant_context computed fields to tenant_profiles for better querying
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS is_voucher_holder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_residential_tenancy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_marine_tenancy boolean DEFAULT false;

-- Function to compute tenant context based on applications and voucher status
CREATE OR REPLACE FUNCTION compute_tenant_context(p_user_id uuid)
RETURNS TABLE(
  is_voucher_holder boolean,
  has_residential_tenancy boolean,
  has_marine_tenancy boolean,
  housing_interest boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(tp.voucher_holder, false) as is_voucher_holder,
    EXISTS(
      SELECT 1 FROM property_applications pa
      JOIN properties p ON pa.property_id = p.id
      WHERE pa.tenant_id = p_user_id 
      AND pa.status = 'approved'
      AND p.property_type IN ('residential', 'commercial')
    ) as has_residential_tenancy,
    EXISTS(
      SELECT 1 FROM property_applications pa
      JOIN properties p ON pa.property_id = p.id
      WHERE pa.tenant_id = p_user_id 
      AND pa.status = 'approved'
      AND p.property_type = 'marine'
    ) as has_marine_tenancy,
    COALESCE(tp.housing_interest, false) as housing_interest
  FROM tenant_profiles tp
  WHERE tp.user_id = p_user_id;
END;
$$;

-- Function to determine marketplace access based on business rules
CREATE OR REPLACE FUNCTION should_show_marketplace(
  p_user_id uuid,
  p_marketplace_mode text DEFAULT 'section8'
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  tenant_ctx RECORD;
  business_phase text;
BEGIN
  -- Get current business phase
  SELECT (setting_value ->> 0)::text INTO business_phase
  FROM enterprise_settings 
  WHERE setting_key = 'business_phase';
  
  -- Default to section8 if not set
  business_phase := COALESCE(business_phase, 'section8');
  
  -- Get tenant context
  SELECT * INTO tenant_ctx FROM compute_tenant_context(p_user_id);
  
  -- If no tenant profile exists, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Apply business rules based on mode and phase
  CASE p_marketplace_mode
    WHEN 'section8' THEN
      -- In section8 mode, only voucher holders or those with explicit housing interest see marketplace
      RETURN tenant_ctx.is_voucher_holder OR tenant_ctx.housing_interest;
      
    WHEN 'mixed' THEN
      -- In mixed mode, broader access based on business phase
      IF business_phase = 'section8' THEN
        -- Still restrictive in section8 business phase
        RETURN tenant_ctx.is_voucher_holder OR tenant_ctx.housing_interest;
      ELSE
        -- In mixed business phase, anyone with housing interest or residential tenancy
        RETURN tenant_ctx.housing_interest OR tenant_ctx.has_residential_tenancy;
      END IF;
      
    ELSE
      -- Default to false for unknown modes
      RETURN false;
  END CASE;
END;
$$;
