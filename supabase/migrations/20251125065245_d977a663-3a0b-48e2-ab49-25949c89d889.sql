-- Fix both trigger functions to remove non-existent last_modified_by references
-- and invalid case_manager references from system_admins

-- Fix log_tenant_stage_change - remove last_modified_by reference
CREATE OR REPLACE FUNCTION log_tenant_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type text;
  v_performed_by uuid;
  v_actor_name text;
BEGIN
  -- Use auth.uid() since profiles table doesn't have last_modified_by column
  v_performed_by := COALESCE(auth.uid(), NEW.assigned_worker_id);

  -- Get action type based on user's role priority
  SELECT 
    COALESCE(p.full_name, p.email, 'System') as actor_name,
    CASE 
      -- Check system admins first (only valid system_admin roles)
      WHEN EXISTS (
        SELECT 1 FROM system_admins sa
        WHERE sa.user_id = v_performed_by 
        AND sa.is_active = true
        AND sa.role_name IN ('super_admin', 'operations_admin', 'matchmaker')
      ) THEN 'admin'
      -- Then check account roles
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('owner', 'admin_partner')
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM account_roles ar
        WHERE ar.user_id = v_performed_by 
        AND ar.is_active = true
        AND ar.role_name IN ('editor', 'maintenance', 'case_manager')
      ) THEN 'worker'
      ELSE 'system'
    END as action_type
  INTO v_actor_name, v_action_type
  FROM profiles p
  WHERE p.id = v_performed_by;

  -- Insert activity log
  INSERT INTO account_activity_log (
    action_type,
    target_user_id,
    performed_by,
    details
  ) VALUES (
    v_action_type,
    NEW.id,
    v_performed_by,
    jsonb_build_object(
      'tenant_id', NEW.id,
      'old_stage', OLD.tenant_stage,
      'new_stage', NEW.tenant_stage,
      'actor_name', v_actor_name,
      'timestamp', now()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix log_property_stage_change - remove case_manager from system_admins check
CREATE OR REPLACE FUNCTION log_property_stage_change()
RETURNS TRIGGER AS $$
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
    is_forward := is_property_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    
    SELECT COALESCE(address, 'Unknown Address') INTO property_address
    FROM properties
    WHERE id = NEW.property_id;
    
    SELECT landlord_id INTO actor_id
    FROM properties
    WHERE id = NEW.property_id;
    
    IF actor_id IS NOT NULL THEN
      actor_type := get_user_action_type(actor_id);
      
      -- Check system_admins ONLY for valid system_admin role types
      SELECT sa.role_name, CONCAT(p.first_name, ' ', p.last_name) INTO actor_role, actor_name
      FROM system_admins sa
      JOIN profiles p ON p.id = sa.user_id
      WHERE sa.user_id = actor_id
      AND sa.is_active = true
      AND sa.role_name IN ('super_admin', 'operations_admin', 'matchmaker')
      ORDER BY 
        CASE sa.role_name
          WHEN 'super_admin' THEN 1
          WHEN 'operations_admin' THEN 2
          WHEN 'matchmaker' THEN 3
          ELSE 4
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
            WHEN 'case_manager' THEN 4
            WHEN 'viewer' THEN 5
            ELSE 6
          END
        LIMIT 1;
      END IF;
    ELSE
      actor_type := 'system';
      actor_role := NULL;
      actor_name := 'System';
    END IF;
    
    IF is_forward AND actor_type IN ('worker', 'admin') THEN
      IF OLD.pipeline_stage = 'assigned' AND NEW.pipeline_stage = 'lease_signed' THEN
        points := 1;
      ELSIF OLD.pipeline_stage = 'lease_signed' AND NEW.pipeline_stage = 'paid' THEN
        points := 2;
      ELSE
        points := 0.5;
      END IF;
    ELSIF NOT is_forward AND actor_type IN ('worker', 'admin') THEN
      points := -0.5;
    ELSE
      points := 0;
    END IF;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;