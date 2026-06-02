-- Fix log_property_stage_change to fetch owner_id from properties table
-- The property_units table doesn't have owner_id, it's in properties table

CREATE OR REPLACE FUNCTION public.log_property_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_details JSONB;
  v_owner_id UUID;
BEGIN
  -- Only log if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Fetch owner_id from properties table
    SELECT owner_id INTO v_owner_id
    FROM properties
    WHERE id = NEW.property_id;

    v_action_type := CASE
      WHEN OLD.pipeline_stage IS NULL THEN 'property_unit_stage_initialized'
      ELSE 'property_unit_stage_changed'
    END;

    v_details := jsonb_build_object(
      'unit_id', NEW.id,
      'property_id', NEW.property_id,
      'unit_number', NEW.unit_number,
      'unit_name', NEW.unit_name,
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    -- Insert into account_activity_log using fetched owner_id
    INSERT INTO account_activity_log (
      action_type,
      performed_by,
      target_user_id,
      details
    )
    VALUES (
      v_action_type,
      v_owner_id,
      v_owner_id,
      v_details
    );
  END IF;

  RETURN NEW;
END;
$$;