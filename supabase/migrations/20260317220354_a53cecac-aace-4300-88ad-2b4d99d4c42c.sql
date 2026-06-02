-- Add UPDATE trigger on tenant_profiles for scoring-relevant column changes
CREATE OR REPLACE FUNCTION trigger_tenant_update_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.zip_code IS DISTINCT FROM NEW.zip_code
   OR OLD.rent_range_max IS DISTINCT FROM NEW.rent_range_max
   OR OLD.voucher_amount IS DISTINCT FROM NEW.voucher_amount
   OR OLD.bedrooms_approved IS DISTINCT FROM NEW.bedrooms_approved
   OR OLD.move_in_window IS DISTINCT FROM NEW.move_in_window
   OR OLD.has_pets IS DISTINCT FROM NEW.has_pets
   OR OLD.state IS DISTINCT FROM NEW.state) THEN
    INSERT INTO match_compute_queue (entity_type, entity_id)
    VALUES ('tenant', NEW.user_id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET requested_at = now(), processing_started_at = NULL, attempts = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_tenant_update_queue
  AFTER UPDATE ON tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tenant_update_queue();

-- Add UPDATE trigger on property_units for rent/bedrooms/market changes
CREATE OR REPLACE FUNCTION trigger_unit_update_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.monthly_rent IS DISTINCT FROM NEW.monthly_rent
   OR OLD.bedrooms IS DISTINCT FROM NEW.bedrooms
   OR OLD.on_market IS DISTINCT FROM NEW.on_market) THEN
    INSERT INTO match_compute_queue (entity_type, entity_id)
    VALUES ('property', NEW.id)
    ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET requested_at = now(), processing_started_at = NULL, attempts = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_unit_update_queue
  AFTER UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION trigger_unit_update_queue();