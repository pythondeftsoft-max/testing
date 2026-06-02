-- Step 2A: Create trigger function only (no backfill yet)

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS maintenance_request_changes ON maintenance_requests CASCADE;
DROP FUNCTION IF EXISTS handle_maintenance_request_changes() CASCADE;

-- Recreate the function with correct column names
CREATE OR REPLACE FUNCTION handle_maintenance_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id_var UUID;
  property_id_var UUID;
  property_application_id UUID;
  owner_id_var UUID;
  message_payload JSONB;
  message_text TEXT;
BEGIN
  -- Get tenant_id (requester)
  tenant_id_var := COALESCE(NEW.requester_id, OLD.requester_id);
  
  -- Get property_id from unit_id or property_id
  IF NEW.unit_id IS NOT NULL THEN
    SELECT property_id INTO property_id_var FROM units WHERE id = NEW.unit_id;
  ELSE
    property_id_var := NEW.property_id;
  END IF;
  
  -- Get property_application_id for this tenant and property
  SELECT pa.id INTO property_application_id
  FROM property_applications pa
  WHERE pa.property_id = property_id_var
    AND pa.tenant_id = tenant_id_var
  LIMIT 1;
  
  -- Skip if no property_application found
  IF property_application_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get owner_id
  SELECT owner_id INTO owner_id_var FROM properties WHERE id = property_id_var;
  
  -- Handle INSERT (new maintenance request)
  IF TG_OP = 'INSERT' THEN
    message_payload := jsonb_build_object(
      'maintenance_request_id', NEW.id,
      'title', NEW.title,
      'description', NEW.description,
      'priority', NEW.priority,
      'status', NEW.status
    );
    
    message_text := 'New maintenance request: ' || NEW.title;
    
    INSERT INTO messages (
      sender_id,
      property_application_id,
      event,
      message_text,
      payload,
      extension,
      created_at,
      created_by_tenant
    ) VALUES (
      tenant_id_var,
      property_application_id,
      'maintenance_request',
      message_text,
      message_payload,
      'maintenance',
      NEW.created_at,
      true
    );
  END IF;
  
  -- Handle UPDATE (status changes)
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    message_payload := jsonb_build_object(
      'maintenance_request_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'title', NEW.title
    );
    
    message_text := 'Status updated: ' || OLD.status || ' → ' || NEW.status;
    
    INSERT INTO messages (
      sender_id,
      property_application_id,
      event,
      message_text,
      payload,
      extension,
      created_at,
      created_by_tenant
    ) VALUES (
      owner_id_var,
      property_application_id,
      'status_update',
      message_text,
      message_payload,
      'maintenance',
      NOW(),
      false
    );
  END IF;
  
  -- Handle UPDATE (vendor assignment)
  IF TG_OP = 'UPDATE' AND OLD.assigned_vendor_id IS DISTINCT FROM NEW.assigned_vendor_id AND NEW.assigned_vendor_id IS NOT NULL THEN
    message_payload := jsonb_build_object(
      'maintenance_request_id', NEW.id,
      'vendor_id', NEW.assigned_vendor_id,
      'title', NEW.title
    );
    
    message_text := 'Vendor assigned to: ' || NEW.title;
    
    INSERT INTO messages (
      sender_id,
      property_application_id,
      event,
      message_text,
      payload,
      extension,
      created_at,
      created_by_tenant
    ) VALUES (
      owner_id_var,
      property_application_id,
      'vendor_assignment',
      message_text,
      message_payload,
      'maintenance',
      NOW(),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER maintenance_request_changes
AFTER INSERT OR UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION handle_maintenance_request_changes();