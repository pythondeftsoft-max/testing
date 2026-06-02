-- Fix assign_tenant_territory function to use proper search_path
CREATE OR REPLACE FUNCTION public.assign_tenant_territory()
RETURNS TRIGGER AS $$
DECLARE
  country_name TEXT;
  matched_territory_id UUID;
BEGIN
  -- Only update if state or country_code changed (or on INSERT)
  IF (TG_OP = 'INSERT' OR OLD.state IS DISTINCT FROM NEW.state OR OLD.country_code IS DISTINCT FROM NEW.country_code) THEN
    -- Map country code to full name
    country_name := CASE 
      WHEN NEW.country_code = 'US' THEN 'United States'
      ELSE NEW.country_code
    END;
    
    -- Look up matching territory (using fully qualified table name)
    SELECT id INTO matched_territory_id
    FROM public.territories
    WHERE region_code = NEW.state 
      AND country = country_name
      AND is_active = true
    LIMIT 1;
    
    -- Update the profiles table with the matched territory_id
    IF matched_territory_id IS NOT NULL THEN
      UPDATE public.profiles
      SET territory_id = matched_territory_id
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;