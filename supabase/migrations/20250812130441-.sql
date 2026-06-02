-- Create trigger for maintenance requests
DROP TRIGGER IF EXISTS maintenance_request_notification_trigger ON public.maintenance_requests;
CREATE TRIGGER maintenance_request_notification_trigger
  AFTER INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_maintenance_request();

-- Add more notification types for comprehensive coverage
CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify tenant about document upload confirmation
    PERFORM send_notification(
      NEW.uploaded_by,
      'Document Uploaded Successfully ✅',
      'Your document "' || NEW.document_name || '" has been uploaded and is being reviewed.',
      'document_uploaded',
      'low',
      'Documents',
      '/documents',
      'view_documents',
      jsonb_build_object('document_id', NEW.id, 'document_name', NEW.document_name)
    );
    
    -- Notify property owner about new document if it's related to a property
    IF NEW.property_id IS NOT NULL THEN
      PERFORM send_notification(
        (SELECT owner_id FROM properties WHERE id = NEW.property_id),
        'New Document Received',
        'A new document "' || NEW.document_name || '" has been uploaded for your property.',
        'document_received',
        'medium',
        'Documents',
        '/property-documents?property=' || NEW.property_id,
        'review_document',
        jsonb_build_object('document_id', NEW.id, 'property_id', NEW.property_id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create function to notify on viewing appointments
CREATE OR REPLACE FUNCTION notify_viewing_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify tenant about appointment confirmation
    PERFORM send_notification(
      NEW.tenant_id,
      'Viewing Appointment Scheduled 📅',
      'Your viewing appointment has been scheduled for ' || NEW.appointment_date::text || '.',
      'appointment_scheduled',
      'medium',
      'Appointments',
      '/appointments?id=' || NEW.id,
      'view_appointment',
      jsonb_build_object('appointment_id', NEW.id, 'property_id', NEW.property_id)
    );
    
    -- Notify landlord about new appointment
    PERFORM send_notification(
      NEW.landlord_id,
      'New Viewing Appointment Request',
      'A tenant has requested a viewing appointment for ' || NEW.appointment_date::text || '.',
      'appointment_requested',
      'high',
      'Appointments',
      '/landlord-appointments?id=' || NEW.id,
      'review_appointment',
      jsonb_build_object('appointment_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;

  -- Notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Appointment Confirmed ✅',
        'Your viewing appointment for ' || NEW.appointment_date::text || ' has been confirmed.',
        'appointment_confirmed',
        'medium',
        'Appointments',
        '/appointments?id=' || NEW.id,
        'view_appointment',
        jsonb_build_object('appointment_id', NEW.id)
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Appointment Cancelled',
        'Your viewing appointment has been cancelled. You can schedule a new one.',
        'appointment_cancelled',
        'medium',
        'Appointments',
        '/search',
        'browse_properties',
        jsonb_build_object('appointment_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create function to notify on property status changes
CREATE OR REPLACE FUNCTION notify_property_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify on property status changes that affect tenants
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'available' AND OLD.status != 'available' THEN
      -- Property became available - notify interested tenants (saved properties)
      INSERT INTO notifications (user_id, title, description, type, priority, category, link, action_type, action_data)
      SELECT 
        sp.user_id,
        'Property Now Available! 🏠',
        'A property you saved is now available for applications at ' || NEW.address || '.',
        'property_available',
        'high',
        'Property',
        '/property/' || NEW.id,
        'view_property',
        jsonb_build_object('property_id', NEW.id)
      FROM saved_properties sp
      WHERE sp.property_id = NEW.id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for additional notifications
DROP TRIGGER IF EXISTS viewing_appointment_notification_trigger ON public.viewing_appointments;
CREATE TRIGGER viewing_appointment_notification_trigger
  AFTER INSERT OR UPDATE ON public.viewing_appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_viewing_appointment();

DROP TRIGGER IF EXISTS property_update_notification_trigger ON public.properties;
CREATE TRIGGER property_update_notification_trigger
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_updates();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;