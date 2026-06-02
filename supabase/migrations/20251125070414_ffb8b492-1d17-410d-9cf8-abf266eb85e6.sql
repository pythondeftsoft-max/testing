-- Fix log_tenant_stage_change and log_property_stage_change functions
-- Replace current_stage with pipeline_stage and remove is_active checks

CREATE OR REPLACE FUNCTION public.log_tenant_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_metadata JSONB;
BEGIN
  -- Only log if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    v_action := CASE
      WHEN OLD.pipeline_stage IS NULL THEN 'tenant.stage.initialized'
      ELSE 'tenant.stage.changed'
    END;

    v_metadata := jsonb_build_object(
      'tenant_id', NEW.id,
      'tenant_email', NEW.email,
      'tenant_name', CONCAT(NEW.first_name, ' ', NEW.last_name),
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    INSERT INTO admin_audit_log (user_id, action, allowed, metadata)
    VALUES (NEW.id, v_action, true, v_metadata);
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
  v_action TEXT;
  v_metadata JSONB;
BEGIN
  -- Only log if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    v_action := CASE
      WHEN OLD.pipeline_stage IS NULL THEN 'property.stage.initialized'
      ELSE 'property.stage.changed'
    END;

    v_metadata := jsonb_build_object(
      'property_id', NEW.id,
      'property_address', NEW.address,
      'old_stage', COALESCE(OLD.pipeline_stage, 'none'),
      'new_stage', NEW.pipeline_stage
    );

    INSERT INTO admin_audit_log (user_id, action, allowed, metadata)
    VALUES (NEW.owner_id, v_action, true, v_metadata);
  END IF;

  RETURN NEW;
END;
$$;