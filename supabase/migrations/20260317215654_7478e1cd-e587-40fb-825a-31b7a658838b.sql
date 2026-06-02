-- Clean up zombie queue items with excessive retries
DELETE FROM match_compute_queue WHERE attempts > 100;

-- Make trigger functions SECURITY DEFINER to prevent RLS issues
CREATE OR REPLACE FUNCTION trigger_new_tenant_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO match_compute_queue (entity_type, entity_id)
  VALUES ('tenant', NEW.user_id)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET requested_at = now(), processing_started_at = NULL, attempts = 0;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_new_property_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO match_compute_queue (entity_type, entity_id)
  VALUES ('property', NEW.id)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET requested_at = now(), processing_started_at = NULL, attempts = 0;
  RETURN NEW;
END;
$$;