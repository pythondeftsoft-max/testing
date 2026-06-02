-- Tenant territory assignment triggers and backfill

-- Function to auto-assign territory to tenants when their profile state/country changes
CREATE OR REPLACE FUNCTION assign_tenant_territory()
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
    
    -- Look up matching territory
    SELECT id INTO matched_territory_id
    FROM territories
    WHERE region_code = NEW.state 
      AND country = country_name
      AND is_active = true
    LIMIT 1;
    
    -- Update the profiles table with the matched territory_id
    IF matched_territory_id IS NOT NULL THEN
      UPDATE profiles
      SET territory_id = matched_territory_id
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment on tenant_profiles changes
DROP TRIGGER IF EXISTS trigger_assign_tenant_territory ON tenant_profiles;
CREATE TRIGGER trigger_assign_tenant_territory
  BEFORE INSERT OR UPDATE OF state, country_code ON tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_tenant_territory();

-- Function to backfill tenants when a territory is created/updated
CREATE OR REPLACE FUNCTION backfill_tenants_on_territory_change()
RETURNS TRIGGER AS $$
DECLARE
  updated_tenants_count INTEGER;
BEGIN
  -- Update tenant profiles that match the new/updated territory
  WITH updated_tenants AS (
    UPDATE profiles
    SET territory_id = NEW.id
    WHERE territory_id IS NULL
      AND id IN (
        SELECT user_id 
        FROM tenant_profiles
        WHERE state = NEW.region_code
          AND (
            (country_code = 'US' AND NEW.country = 'United States') OR
            (country_code = NEW.country)
          )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_tenants_count FROM updated_tenants;

  -- Log the backfill results
  RAISE NOTICE 'Territory % (%, %): Backfilled % tenants', 
    NEW.territory_name, NEW.region_code, NEW.country, 
    updated_tenants_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for backfilling on territory creation/update
DROP TRIGGER IF EXISTS trigger_backfill_tenants_on_territory_change ON territories;
CREATE TRIGGER trigger_backfill_tenants_on_territory_change
  AFTER INSERT OR UPDATE OF region_code, country, is_active ON territories
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION backfill_tenants_on_territory_change();

-- Run initial backfill for existing tenants
UPDATE profiles p
SET territory_id = t.id
FROM territories t, tenant_profiles tp
WHERE tp.user_id = p.id
  AND p.territory_id IS NULL
  AND tp.state IS NOT NULL
  AND tp.state = t.region_code
  AND (
    (tp.country_code = 'US' AND t.country = 'United States') OR
    (tp.country_code = t.country)
  )
  AND t.is_active = true;