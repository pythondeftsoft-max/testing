-- Fix the trigger function with correct column names
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

-- Now sync pipeline_stage with housing_status for existing tenants
UPDATE profiles
SET pipeline_stage = CASE 
  WHEN housing_status = 'seeking' AND assigned_worker_id IS NOT NULL THEN 'assigned'
  WHEN housing_status = 'seeking' AND assigned_worker_id IS NULL THEN 'unassigned'
  WHEN housing_status = 'approved' THEN 'approved_awaiting'
  WHEN housing_status = 'housed' THEN 'housed_paid'
  ELSE pipeline_stage
END
WHERE housing_status IS NOT NULL 
  AND pipeline_stage IS NULL;