-- Fix log_property_stage_change to use correct property_units fields
-- The trigger operates on property_units table, not properties table
-- So NEW.address doesn't exist - use unit-specific fields instead

CREATE OR REPLACE FUNCTION public.log_property_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_details JSONB;
BEGIN
  -- Only log if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    v_action_type := CASE
      WHEN OLD.pipeline_stage IS NULL THEN 'property_unit_stage_initialized'
      ELSE 'property_unit_stage_changed'
    END;

    v_details := jsonb_build_object(
      'unit_id', NEW.id,
      'property_id', NEW.property_id,
      'unit_number', NEW.unit_number,
      'unit_name', NEW.unit_name,
      'owner_id', NEW.owner_id,
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    -- Insert into account_activity_log
    INSERT INTO account_activity_log (
      action_type,
      performed_by,
      target_user_id,
      details
    )
    VALUES (
      v_action_type,
      NEW.owner_id,
      NEW.owner_id,
      v_details
    );
  END IF;

  RETURN NEW;
END;
$$;