
-- Fix the toggle_property_market_listing function to properly handle pet_policy enum type
CREATE OR REPLACE FUNCTION public.toggle_property_market_listing(
  p_property_id uuid,
  p_on_market boolean,
  p_listing_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_exists boolean;
  has_approved_tenant boolean;
BEGIN
  -- Check if property exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM public.properties 
    WHERE id = p_property_id 
    AND (owner_id = auth.uid() OR owner_id = p_user_id)
  ) INTO property_exists;
  
  IF NOT property_exists THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;

  -- Check if property has approved tenant
  SELECT EXISTS(
    SELECT 1 FROM public.property_applications 
    WHERE property_id = p_property_id 
    AND status = 'approved'
  ) INTO has_approved_tenant;

  -- Update property with conditional logic for vacant properties going off market
  UPDATE public.properties 
  SET 
    on_market = p_on_market,
    monthly_rent = CASE 
      WHEN p_on_market = false AND NOT has_approved_tenant THEN NULL
      ELSE COALESCE((p_listing_data->>'monthly_rent')::NUMERIC, monthly_rent)
    END,
    description = CASE 
      WHEN p_on_market = false AND NOT has_approved_tenant THEN NULL
      ELSE COALESCE(p_listing_data->>'description', description)
    END,
    pet_policy = CASE 
      WHEN p_on_market = false AND NOT has_approved_tenant THEN NULL
      ELSE COALESCE((p_listing_data->>'pet_policy')::pet_policy, pet_policy)
    END,
    amenities = CASE 
      WHEN p_on_market = false AND NOT has_approved_tenant THEN NULL
      ELSE COALESCE((p_listing_data->>'amenities')::TEXT[], amenities)
    END,
    -- Always update structural data regardless of market status
    bedrooms = COALESCE((p_listing_data->>'bedrooms')::INTEGER, bedrooms),
    bathrooms = COALESCE((p_listing_data->>'bathrooms')::NUMERIC, bathrooms),
    square_feet = COALESCE((p_listing_data->>'square_feet')::INTEGER, square_feet),
    updated_at = now()
  WHERE id = p_property_id;

  RETURN true;
END;
$$;
