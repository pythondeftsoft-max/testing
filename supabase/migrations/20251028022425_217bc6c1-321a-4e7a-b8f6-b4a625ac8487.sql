-- Backfill: Create property_tenant_requests for all existing unit assignments
-- Only set unit_id (not property_id) per the constraint
INSERT INTO property_tenant_requests (unit_id, requested_by, status, created_at)
SELECT DISTINCT
  pu.id as unit_id,
  pu.tenant_id as requested_by,
  'approved' as status,
  NOW() as created_at
FROM property_units pu
WHERE pu.tenant_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM property_tenant_requests ptr
  WHERE ptr.requested_by = pu.tenant_id
  AND ptr.unit_id = pu.id
);

-- Function to create property_tenant_requests record when tenant is assigned to unit
CREATE OR REPLACE FUNCTION create_tenant_request_on_unit_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if tenant_id is being set (new assignment or change)
  IF NEW.tenant_id IS NOT NULL AND (OLD.tenant_id IS NULL OR OLD.tenant_id != NEW.tenant_id) THEN
    -- Check if property_tenant_requests record already exists
    IF NOT EXISTS (
      SELECT 1 FROM property_tenant_requests 
      WHERE requested_by = NEW.tenant_id 
      AND unit_id = NEW.id
    ) THEN
      -- Create the property_tenant_requests record with only unit_id
      INSERT INTO property_tenant_requests (
        unit_id,
        requested_by,
        status,
        created_at
      ) VALUES (
        NEW.id,
        NEW.tenant_id,
        'approved',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS ensure_tenant_request_on_unit_assignment ON property_units;
CREATE TRIGGER ensure_tenant_request_on_unit_assignment
  AFTER INSERT OR UPDATE OF tenant_id ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION create_tenant_request_on_unit_assignment();

-- Update the maintenance trigger to search by unit_id as well
CREATE OR REPLACE FUNCTION handle_maintenance_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  property_app_id UUID;
  landlord_id UUID;
  message_text TEXT;
  event_type TEXT;
  message_payload JSONB;
BEGIN
  -- Find the property_application_id (search by unit_id or property_id)
  SELECT id INTO property_app_id
  FROM property_tenant_requests
  WHERE requested_by = NEW.tenant_id 
    AND (
      unit_id = NEW.unit_id 
      OR property_id = NEW.property_id
    )
  LIMIT 1;

  -- If no application found, skip message creation
  IF property_app_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the landlord/PM from the property
  SELECT landlord_id INTO landlord_id
  FROM properties
  WHERE id = NEW.property_id;

  -- Handle INSERT (new maintenance request)
  IF TG_OP = 'INSERT' THEN
    event_type := 'maintenance_request_created';
    message_text := '🔧 **New Maintenance Request**: ' || NEW.title || E'\n' ||
                   '📋 **Description**: ' || COALESCE(NEW.description, 'No description provided') || E'\n' ||
                   '⚡ **Priority**: ' || NEW.priority || E'\n' ||
                   '📍 **Location**: ' || COALESCE(NEW.location, 'Not specified');
    
    message_payload := jsonb_build_object(
      'request_id', NEW.id,
      'title', NEW.title,
      'priority', NEW.priority,
      'category', NEW.category
    );

    INSERT INTO messages (
      property_application_id,
      sender_id,
      recipient_id,
      message_text,
      extension,
      event,
      payload
    ) VALUES (
      property_app_id,
      NEW.tenant_id,
      landlord_id,
      message_text,
      'maintenance',
      event_type,
      message_payload
    );

  -- Handle UPDATE (status changes)
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Status changed to completed
    IF NEW.status = 'completed' THEN
      event_type := 'maintenance_completed';
      message_text := '✅ **Maintenance Request Completed**: ' || NEW.title || E'\n' ||
                     '📅 **Completed on**: ' || TO_CHAR(NEW.completed_at, 'Mon DD, YYYY at HH:MI AM');
      
      message_payload := jsonb_build_object(
        'request_id', NEW.id,
        'title', NEW.title,
        'completed_at', NEW.completed_at
      );

    -- Status changed to in_progress
    ELSIF NEW.status = 'in_progress' THEN
      event_type := 'maintenance_status_updated';
      message_text := '🔄 **Maintenance Request In Progress**: ' || NEW.title || E'\n' ||
                     '👷 Work has begun on your maintenance request.';
      
      message_payload := jsonb_build_object(
        'request_id', NEW.id,
        'title', NEW.title,
        'new_status', NEW.status,
        'old_status', OLD.status
      );

    ELSE
      -- Other status changes
      RETURN NEW;
    END IF;

    INSERT INTO messages (
      property_application_id,
      sender_id,
      recipient_id,
      message_text,
      extension,
      event,
      payload
    ) VALUES (
      property_app_id,
      landlord_id,
      NEW.tenant_id,
      message_text,
      'maintenance',
      event_type,
      message_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS maintenance_request_changes_trigger ON maintenance_requests;
CREATE TRIGGER maintenance_request_changes_trigger
  AFTER INSERT OR UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_maintenance_request_changes();