-- Fix search_path security warning for assign_tenant_territory function
CREATE OR REPLACE FUNCTION assign_tenant_territory()
RETURNS TRIGGER AS $$
DECLARE
  v_territory_id uuid;
BEGIN
  -- Only proceed if state and country_code are provided
  IF NEW.state IS NOT NULL AND NEW.country_code IS NOT NULL THEN
    
    -- Look up matching territory
    SELECT id INTO v_territory_id
    FROM territories
    WHERE country = NEW.country_code
    AND region_code = NEW.state
    LIMIT 1;
    
    -- If territory found, update the profile
    IF v_territory_id IS NOT NULL THEN
      UPDATE profiles
      SET territory_id = v_territory_id
      WHERE id = NEW.user_id;
      
      RAISE NOTICE 'Assigned territory % to tenant %', v_territory_id, NEW.user_id;
    ELSE
      RAISE NOTICE 'No territory found for % - %', NEW.country_code, NEW.state;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;