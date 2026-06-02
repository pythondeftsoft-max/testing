-- Drop and recreate the trigger to remove redundant tenant submission notifications
DROP TRIGGER IF EXISTS handle_maintenance_request_changes ON maintenance_requests;

-- Recreate the trigger function WITHOUT tenant submission notification
CREATE OR REPLACE FUNCTION handle_maintenance_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  property_owner_id UUID;
  property_address TEXT;
  unit_info TEXT;
BEGIN
  -- Get property owner and address
  SELECT 
    p.owner_id,
    p.address,
    pu.unit_number
  INTO property_owner_id, property_address, unit_info
  FROM properties p
  LEFT JOIN property_units pu ON pu.id = NEW.unit_id
  WHERE p.id = NEW.property_id;

  -- Notify property owner of new request (with actual title)
  IF TG_OP = 'INSERT' THEN
    PERFORM send_notification(
      property_owner_id,
      'New: ' || NEW.title,
      NEW.category || ' issue at ' || property_address || COALESCE(' - Unit ' || unit_info, ''),
      'maintenance_request_received',
      CASE 
        WHEN NEW.priority = 'high' THEN 'high'
        WHEN NEW.priority = 'medium' THEN 'medium'
        ELSE 'low'
      END,
      'Maintenance',
      '/maintenance-requests?id=' || NEW.id,
      'view_request',
      jsonb_build_object('request_id', NEW.id, 'priority', NEW.priority, 'title', NEW.title)
    );
    
    -- REMOVED: Tenant submission notification (redundant - they just created it)
  END IF;

  -- Keep status change notifications
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Maintenance Request Completed',
        'Your maintenance request has been completed.',
        'maintenance_request_completed',
        'medium',
        'Maintenance',
        '/maintenance-requests?id=' || NEW.id,
        'view_request',
        jsonb_build_object('request_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER handle_maintenance_request_changes
  AFTER INSERT OR UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_maintenance_request_changes();

-- Clean up existing generic submission notifications
DELETE FROM notifications 
WHERE type = 'maintenance_request_submitted' 
  AND title = 'Maintenance Request Submitted';