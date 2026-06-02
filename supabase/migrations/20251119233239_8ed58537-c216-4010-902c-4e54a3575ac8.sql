-- Add helper function to determine user action type
CREATE OR REPLACE FUNCTION get_user_action_type(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE account_roles.user_id = get_user_action_type.user_id 
    AND role_name IN ('super_admin', 'account_admin')
    AND is_active = true
  ) THEN
    RETURN 'admin';
  -- Check if user is a worker
  ELSIF EXISTS (
    SELECT 1 FROM account_roles 
    WHERE account_roles.user_id = get_user_action_type.user_id 
    AND role_name IN ('worker', 'matchmaker', 'case_manager')
    AND is_active = true
  ) THEN
    RETURN 'worker';
  ELSE
    RETURN 'system';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update log_tenant_stage_change trigger function to track admin actions
CREATE OR REPLACE FUNCTION log_tenant_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  is_forward BOOLEAN;
  points NUMERIC;
  actor_id UUID;
  actor_type TEXT;
  actor_role TEXT;
  actor_name TEXT;
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Determine if this is a forward move
    is_forward := is_tenant_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    
    -- Determine who made the change
    actor_id := COALESCE(NEW.updated_by, NEW.assigned_worker_id);
    
    -- Get actor type (worker, admin, or system)
    IF actor_id IS NOT NULL THEN
      actor_type := get_user_action_type(actor_id);
      
      -- Get the user's role name and name for metadata
      SELECT ar.role_name, p.full_name INTO actor_role, actor_name
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
      IF OLD.pipeline_stage = 'assigned' AND NEW.pipeline_stage = 'approved_awaiting' THEN
        points := 1;
      ELSIF OLD.pipeline_stage = 'approved_awaiting' AND NEW.pipeline_stage = 'housed_paid' THEN
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
      'tenant',
      NEW.id,
      OLD.pipeline_stage,
      NEW.pipeline_stage,
      actor_type,
      actor_id,
      is_forward,
      points,
      jsonb_build_object(
        'tenant_name', COALESCE(NEW.full_name, NEW.email),
        'actor_name', actor_name,
        'actor_role', actor_role,
        'actor_type', actor_type,
        'territory_id', NEW.territory_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update log_property_stage_change trigger function to track admin actions
CREATE OR REPLACE FUNCTION log_property_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  is_forward BOOLEAN;
  points NUMERIC;
  actor_id UUID;
  actor_type TEXT;
  actor_role TEXT;
  actor_name TEXT;
  prop_address TEXT;
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Determine if this is a forward move
    is_forward := is_property_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    
    -- Determine who made the change
    actor_id := COALESCE(NEW.updated_by, NEW.assigned_worker_id);
    
    -- Get actor type (worker, admin, or system)
    IF actor_id IS NOT NULL THEN
      actor_type := get_user_action_type(actor_id);
      
      -- Get the user's role name and name for metadata
      SELECT ar.role_name, p.full_name INTO actor_role, actor_name
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
    
    -- Get property address
    SELECT address INTO prop_address FROM properties WHERE id = NEW.id;
    
    -- Calculate points based on stage transition and actor type
    IF is_forward AND actor_type IN ('worker', 'admin') THEN
      -- Forward moves: award points based on transition
      IF OLD.pipeline_stage = 'available' AND NEW.pipeline_stage = 'filled_awaiting_payment' THEN
        points := 1;
      ELSIF OLD.pipeline_stage = 'filled_awaiting_payment' AND NEW.pipeline_stage = 'paid' THEN
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
        'property_address', prop_address,
        'actor_name', actor_name,
        'actor_role', actor_role,
        'actor_type', actor_type,
        'territory_id', NEW.territory_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;