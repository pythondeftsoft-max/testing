-- Fix trigger_property_match_version to remove reference to non-existent pets_allowed column
CREATE OR REPLACE FUNCTION public.trigger_property_match_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any match-relevant fields changed
  -- NOTE: pets_allowed column was removed - using pet_fee_monthly instead
  IF (OLD.monthly_rent IS DISTINCT FROM NEW.monthly_rent
   OR OLD.bedrooms IS DISTINCT FROM NEW.bedrooms
   OR OLD.available_date IS DISTINCT FROM NEW.available_date
   OR OLD.on_market IS DISTINCT FROM NEW.on_market)
  THEN
    -- Increment version
    NEW.match_version := COALESCE(OLD.match_version, 0) + 1;
    
    -- Queue for recompute (only if on_market)
    IF NEW.on_market = true THEN
      INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
      VALUES ('property', NEW.id, now())
      ON CONFLICT (entity_type, entity_id) 
      DO UPDATE SET 
        requested_at = now(),
        processing_started_at = NULL,
        attempts = 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;