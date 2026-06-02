-- Add new fields to properties table for enhanced status management
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS occupancy_status TEXT CHECK (occupancy_status IN ('occupied', 'vacant')) DEFAULT 'vacant',
ADD COLUMN IF NOT EXISTS on_market BOOLEAN DEFAULT false;

-- Create computed status function
CREATE OR REPLACE FUNCTION public.get_computed_property_status(
  p_property_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
  computed_status TEXT;
BEGIN
  -- Get property data with tenant info
  SELECT 
    p.*,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM property_applications pa 
        WHERE pa.property_id = p.id 
        AND pa.status = 'approved'
      ) THEN true 
      ELSE false 
    END as has_tenant
  INTO property_record
  FROM properties p 
  WHERE p.id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN 'Unknown';
  END IF;
  
  -- Compute status based on tenant presence and market listing
  IF property_record.has_tenant AND property_record.on_market THEN
    computed_status := 'Occupied / Listed';
  ELSIF property_record.has_tenant AND NOT property_record.on_market THEN
    computed_status := 'Occupied';
  ELSIF NOT property_record.has_tenant AND property_record.on_market THEN
    computed_status := 'Available';
  ELSE
    computed_status := 'Vacant';
  END IF;
  
  RETURN computed_status;
END;
$$;

-- Toggle property market listing with listing data
CREATE OR REPLACE FUNCTION public.toggle_property_market_listing(
  p_property_id UUID,
  p_on_market BOOLEAN,
  p_listing_data JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_owner UUID;
BEGIN
  -- Check if user owns the property
  SELECT owner_id INTO property_owner 
  FROM properties 
  WHERE id = p_property_id;
  
  IF property_owner != p_user_id AND NOT is_admin(p_user_id) THEN
    RAISE EXCEPTION 'Only property owners can manage listings';
  END IF;
  
  -- Update property listing status
  UPDATE properties 
  SET 
    on_market = p_on_market,
    -- Update listing data if provided
    monthly_rent = COALESCE((p_listing_data->>'monthly_rent')::NUMERIC, monthly_rent),
    bedrooms = COALESCE((p_listing_data->>'bedrooms')::INTEGER, bedrooms),
    bathrooms = COALESCE((p_listing_data->>'bathrooms')::NUMERIC, bathrooms),
    description = COALESCE(p_listing_data->>'description', description),
    pet_policy = COALESCE(p_listing_data->>'pet_policy', pet_policy),
    amenities = COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_listing_data->'amenities')), 
      amenities
    ),
    updated_at = now()
  WHERE id = p_property_id;
  
  -- Update occupancy status based on tenant presence
  UPDATE properties
  SET occupancy_status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM property_applications 
      WHERE property_id = p_property_id AND status = 'approved'
    ) THEN 'occupied'
    ELSE 'vacant'
  END
  WHERE id = p_property_id;
  
  RETURN true;
END;
$$;

-- Invite tenant to property
CREATE OR REPLACE FUNCTION public.invite_property_tenant(
  p_property_id UUID,
  p_tenant_email TEXT,
  p_tenant_name TEXT,
  p_rent_amount NUMERIC,
  p_move_in_date DATE,
  p_invited_by UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_user_id UUID;
  application_id UUID;
  property_owner UUID;
BEGIN
  -- Check if user owns the property
  SELECT owner_id INTO property_owner 
  FROM properties 
  WHERE id = p_property_id;
  
  IF property_owner != p_invited_by AND NOT is_admin(p_invited_by) THEN
    RAISE EXCEPTION 'Only property owners can invite tenants';
  END IF;
  
  -- Find or create tenant user
  SELECT id INTO tenant_user_id 
  FROM profiles 
  WHERE email = p_tenant_email;
  
  -- Create property application as approved
  INSERT INTO property_applications (
    property_id,
    tenant_id,
    status,
    desired_rent,
    move_in_date,
    application_date,
    notes
  ) VALUES (
    p_property_id,
    tenant_user_id,
    'approved',
    p_rent_amount,
    p_move_in_date,
    now(),
    'Invited by landlord: ' || p_tenant_name
  ) RETURNING id INTO application_id;
  
  -- Update property status
  UPDATE properties 
  SET 
    occupancy_status = 'occupied',
    on_market = false,
    lease_start_date = p_move_in_date,
    updated_at = now()
  WHERE id = p_property_id;
  
  RETURN application_id;
END;
$$;

-- Remove tenant from property
CREATE OR REPLACE FUNCTION public.remove_property_tenant(
  p_property_id UUID,
  p_removed_by UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_owner UUID;
BEGIN
  -- Check if user owns the property
  SELECT owner_id INTO property_owner 
  FROM properties 
  WHERE id = p_property_id;
  
  IF property_owner != p_removed_by AND NOT is_admin(p_removed_by) THEN
    RAISE EXCEPTION 'Only property owners can remove tenants';
  END IF;
  
  -- Update all approved applications to terminated
  UPDATE property_applications 
  SET 
    status = 'terminated',
    updated_at = now()
  WHERE property_id = p_property_id 
  AND status = 'approved';
  
  -- Update property status
  UPDATE properties 
  SET 
    occupancy_status = 'vacant',
    on_market = false,
    lease_start_date = NULL,
    lease_end_date = NULL,
    updated_at = now()
  WHERE id = p_property_id;
  
  RETURN true;
END;
$$;

-- Migrate existing data to new schema
UPDATE properties 
SET 
  occupancy_status = CASE 
    WHEN status = 'occupied' THEN 'occupied'
    ELSE 'vacant'
  END,
  on_market = CASE 
    WHEN status = 'available' AND deactivated_at IS NULL THEN true
    ELSE false
  END
WHERE occupancy_status IS NULL OR on_market IS NULL;