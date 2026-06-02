-- Fix log_tenant_stage_change and log_property_stage_change to use account_activity_log
-- These triggers were failing because admin_audit_log table doesn't exist

CREATE OR REPLACE FUNCTION public.log_tenant_stage_change()
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
      WHEN OLD.pipeline_stage IS NULL THEN 'tenant_stage_initialized'
      ELSE 'tenant_stage_changed'
    END;

    v_details := jsonb_build_object(
      'tenant_id', NEW.id,
      'tenant_email', NEW.email,
      'tenant_name', CONCAT(NEW.first_name, ' ', NEW.last_name),
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    -- Insert into account_activity_log (not admin_audit_log which doesn't exist)
    INSERT INTO account_activity_log (
      action_type,
      performed_by,
      target_user_id,
      details
    )
    VALUES (
      v_action_type,
      NEW.id,
      NEW.id,
      v_details
    );
  END IF;

  RETURN NEW;
END;
$$;

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
      WHEN OLD.pipeline_stage IS NULL THEN 'property_stage_initialized'
      ELSE 'property_stage_changed'
    END;

    v_details := jsonb_build_object(
      'property_id', NEW.id,
      'property_address', NEW.address,
      'owner_id', NEW.owner_id,
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    -- Insert into account_activity_log (not admin_audit_log which doesn't exist)
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