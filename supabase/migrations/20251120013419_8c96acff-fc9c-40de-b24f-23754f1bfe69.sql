-- Fix property stage change trigger function with correct fields
CREATE OR REPLACE FUNCTION public.log_property_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  is_forward BOOLEAN;
  points NUMERIC;
  actor_id UUID;
  actor_type TEXT;
  actor_role TEXT;
  actor_name TEXT;
  property_address TEXT;
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Determine if this is a forward move
    is_forward := is_property_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    
    -- Get property address from properties table
    SELECT COALESCE(address, 'Unknown Address') INTO property_address
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Determine who made the change (use landlord_id from properties table)
    SELECT landlord_id INTO actor_id
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Get actor type (landlord, admin, or system)
    IF actor_id IS NOT NULL THEN
      actor_type := get_user_action_type(actor_id);
      
      -- Get the user's role name and name for metadata
      SELECT ar.role_name, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
      FROM account_roles ar
      JOIN profiles p ON p.id = ar.user_id
      WHERE ar.user_id = actor_id
      AND ar.is_active = true
      ORDER BY 
        CASE ar.role_name
          WHEN 'super_admin' THEN 1
          WHEN 'account_admin' THEN 2
          WHEN 'worker' THEN 3
          WHEN 'matchmaker' THEN 4
          WHEN 'case_manager' THEN 5
          ELSE 6
        END
      LIMIT 1;
    ELSE
      actor_type := 'system';
      actor_role := NULL;
      actor_name := 'System';
    END IF;
    
    -- Calculate points based on stage transition and actor type
    IF is_forward AND actor_type IN ('worker', 'admin') THEN
      -- Forward moves: award points based on transition
      IF OLD.pipeline_stage = 'assigned' AND NEW.pipeline_stage = 'lease_signed' THEN
        points := 1;
      ELSIF OLD.pipeline_stage = 'lease_signed' AND NEW.pipeline_stage = 'paid' THEN
        points := 2;
      ELSE
        points := 0.5; -- Other forward moves get minimal points
      END IF;
    ELSIF NOT is_forward AND actor_type IN ('worker', 'admin') THEN
      -- Backward moves: penalty
      points := -0.5;
    ELSE
      -- System actions: no points
      points := 0;
    END IF;
    
    -- Insert stage change event
    INSERT INTO stage_change_events (
      entity_type,
      entity_id,
      from_stage,
      to_stage,
      changed_by_type,
      changed_by_id,
      is_forward_move,
      points_earned,
      metadata
    ) VALUES (
      'property',
      NEW.id,
      OLD.pipeline_stage,
      NEW.pipeline_stage,
      actor_type,
      actor_id,
      is_forward,
      points,
      jsonb_build_object(
        'property_address', property_address,
        'property_id', NEW.property_id,
        'unit_number', NEW.unit_number,
        'actor_name', actor_name,
        'actor_role', actor_role,
        'actor_type', actor_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on profiles table for tenant stage changes
DROP TRIGGER IF EXISTS tenant_pipeline_stage_change_trigger ON profiles;
CREATE TRIGGER tenant_pipeline_stage_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION log_tenant_stage_change();

-- Create trigger on property_units table for property stage changes
DROP TRIGGER IF EXISTS property_pipeline_stage_change_trigger ON property_units;
CREATE TRIGGER property_pipeline_stage_change_trigger
  AFTER UPDATE ON property_units
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION log_property_stage_change();

-- Add performance indexes for Activity Tracker
CREATE INDEX IF NOT EXISTS idx_stage_change_events_performance 
  ON stage_change_events(created_at DESC, changed_by_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_stage_change_events_entity 
  ON stage_change_events(entity_id, entity_type);