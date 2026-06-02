-- Update trigger to create messages in addition to notifications
CREATE OR REPLACE FUNCTION handle_maintenance_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  property_owner_id UUID;
  property_address TEXT;
  unit_info TEXT;
  property_app_id UUID;
  message_text TEXT;
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

  -- Find property_application_id (tenant-property relationship)
  SELECT id INTO property_app_id
  FROM property_tenant_requests
  WHERE requested_by = NEW.tenant_id 
    AND property_id = NEW.property_id
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    -- Notify property owner
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
    
    -- Create message in messages table if property_application exists
    IF property_app_id IS NOT NULL THEN
      message_text := '🔧 New Maintenance Request: ' || NEW.title || 
                      E'\n\nCategory: ' || NEW.category ||
                      E'\nPriority: ' || NEW.priority ||
                      E'\nLocation: ' || property_address || COALESCE(' - Unit ' || unit_info, '') ||
                      E'\n\nStatus: Pending review';
      
      INSERT INTO messages (
        property_application_id,
        sender_id,
        message_text,
        extension,
        event,
        created_by_tenant,
        read_by_tenant,
        read_by_landlord,
        payload
      ) VALUES (
        property_app_id,
        NEW.tenant_id,
        message_text,
        'maintenance',
        'maintenance_request_created',
        true,
        false,
        false,
        jsonb_build_object(
          'request_id', NEW.id,
          'title', NEW.title,
          'category', NEW.category,
          'priority', NEW.priority,
          'status', NEW.status
        )
      );
    END IF;
  END IF;

  -- Handle status updates
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
      
      -- Add completion message
      IF property_app_id IS NOT NULL THEN
        message_text := '✅ Maintenance Completed: ' || NEW.title || 
                        E'\n\nYour maintenance request has been completed and closed.';
        
        INSERT INTO messages (
          property_application_id,
          sender_id,
          message_text,
          extension,
          event,
          created_by_tenant,
          read_by_tenant,
          read_by_landlord,
          payload
        ) VALUES (
          property_app_id,
          property_owner_id,
          message_text,
          'maintenance',
          'maintenance_completed',
          false,
          false,
          false,
          jsonb_build_object(
            'request_id', NEW.id,
            'status', NEW.status
          )
        );
      END IF;
    ELSIF NEW.status = 'in_progress' THEN
      -- Add in-progress message
      IF property_app_id IS NOT NULL THEN
        message_text := '🔄 Status Update: ' || NEW.title || 
                        E'\n\nYour maintenance request is now in progress.';
        
        INSERT INTO messages (
          property_application_id,
          sender_id,
          message_text,
          extension,
          event,
          created_by_tenant,
          read_by_tenant,
          read_by_landlord,
          payload
        ) VALUES (
          property_app_id,
          property_owner_id,
          message_text,
          'maintenance',
          'maintenance_status_updated',
          false,
          false,
          false,
          jsonb_build_object(
            'request_id', NEW.id,
            'status', NEW.status
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;