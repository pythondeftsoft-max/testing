-- Fix trigger functions to handle both system_admins and account_roles correctly

-- Update log_tenant_stage_change to check system_admins first
CREATE OR REPLACE FUNCTION public.log_tenant_stage_change()
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
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Determine if this is a forward move
    is_forward := is_tenant_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    
    -- Determine who made the change
    actor_id := NEW.assigned_worker_id;
    
    -- Get actor type (worker, admin, or system)
    IF actor_id IS NOT NULL THEN
      actor_type := get_user_action_type(actor_id);
      
      -- Try to get role from system_admins first
      SELECT sa.role_name, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
      FROM system_admins sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = actor_id
      AND sa.is_active = true
      ORDER BY 
        CASE sa.role_name
          WHEN 'super_admin' THEN 1
          WHEN 'operations_admin' THEN 2
          WHEN 'matchmaker' THEN 3
          WHEN 'case_manager' THEN 4
          ELSE 5
        END
      LIMIT 1;
      
      -- If not found in system_admins, check account_roles
      IF actor_role IS NULL THEN
        SELECT ar.role_name::TEXT, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
        FROM account_roles ar
        JOIN profiles p ON p.id = ar.user_id
        WHERE ar.user_id = actor_id
        AND ar.is_active = true
        ORDER BY 
          CASE ar.role_name
            WHEN 'owner' THEN 1
            WHEN 'admin_partner' THEN 2
            WHEN 'editor' THEN 3
            WHEN 'viewer' THEN 4
            ELSE 5
          END
        LIMIT 1;
      END IF;
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
        'tenant_name', CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')),
        'actor_name', actor_name,
        'actor_role', actor_role,
        'actor_type', actor_type,
        'territory_id', NEW.territory_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update log_property_stage_change to check system_admins first
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
      
      -- Try to get role from system_admins first
      SELECT sa.role_name, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
      FROM system_admins sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = actor_id
      AND sa.is_active = true
      ORDER BY 
        CASE sa.role_name
          WHEN 'super_admin' THEN 1
          WHEN 'operations_admin' THEN 2
          WHEN 'matchmaker' THEN 3
          WHEN 'case_manager' THEN 4
          ELSE 5
        END
      LIMIT 1;
      
      -- If not found in system_admins, check account_roles
      IF actor_role IS NULL THEN
        SELECT ar.role_name::TEXT, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
        FROM account_roles ar
        JOIN profiles p ON p.id = ar.user_id
        WHERE ar.user_id = actor_id
        AND ar.is_active = true
        ORDER BY 
          CASE ar.role_name
            WHEN 'owner' THEN 1
            WHEN 'admin_partner' THEN 2
            WHEN 'editor' THEN 3
            WHEN 'viewer' THEN 4
            ELSE 5
          END
        LIMIT 1;
      END IF;
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