-- Database hardening for Applications MVP + Analytics v2

-- 1. Add unique constraint for marketplace applications (supporting both property and unit level drafts)
ALTER TABLE marketplace_applications 
ADD CONSTRAINT unique_user_property_unit UNIQUE NULLS NOT DISTINCT (user_id, property_id, unit_id);

-- 2. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_user_id ON marketplace_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_property_id ON marketplace_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_status ON marketplace_applications(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_created_at ON marketplace_applications(created_at);

-- 3. Add analytics indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_events_event_type ON marketplace_events(event_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_created_at ON marketplace_events(created_at);

-- 4. Add trigger to auto-update timestamps and set submitted_at
CREATE OR REPLACE FUNCTION update_marketplace_application_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set submitted_at when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    NEW.submitted_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_marketplace_application_timestamps ON marketplace_applications;
CREATE TRIGGER trigger_update_marketplace_application_timestamps
  BEFORE UPDATE ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_application_timestamps();

-- 5. Create notification trigger for landlords when applications are submitted
CREATE OR REPLACE FUNCTION notify_landlord_on_application()
RETURNS TRIGGER AS $$
DECLARE
  property_record RECORD;
  notification_title TEXT;
  notification_desc TEXT;
  notification_link TEXT;
BEGIN
  -- Only trigger when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Get property details and owner
    SELECT p.*, pr.first_name, pr.last_name
    INTO property_record
    FROM properties p
    LEFT JOIN profiles pr ON NEW.user_id = pr.id
    WHERE p.id = NEW.property_id;
    
    IF property_record.owner_id IS NOT NULL THEN
      -- Build notification content
      notification_title := 'New Application Received';
      
      IF NEW.unit_id IS NOT NULL THEN
        SELECT 'Application for Unit ' || pu.unit_number || ' at ' || property_record.address
        INTO notification_desc
        FROM property_units pu
        WHERE pu.id = NEW.unit_id;
      ELSE
        notification_desc := 'Application for ' || property_record.address;
      END IF;
      
      IF property_record.first_name IS NOT NULL THEN
        notification_desc := notification_desc || ' from ' || property_record.first_name;
        IF property_record.last_name IS NOT NULL THEN
          notification_desc := notification_desc || ' ' || property_record.last_name;
        END IF;
      END IF;
      
      notification_link := '/marketplace-applications?propertyId=' || NEW.property_id;
      
      -- Insert notification
      INSERT INTO notifications (
        user_id,
        title,
        description,
        type,
        link,
        category,
        related_entity_id,
        related_entity_type,
        metadata
      ) VALUES (
        property_record.owner_id,
        notification_title,
        notification_desc,
        'info',
        notification_link,
        'applications',
        NEW.id,
        'marketplace_application',
        jsonb_build_object(
          'property_id', NEW.property_id,
          'unit_id', NEW.unit_id,
          'tenant_id', NEW.user_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_landlord_on_application ON marketplace_applications;
CREATE TRIGGER trigger_notify_landlord_on_application
  AFTER UPDATE ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_landlord_on_application();

-- Also trigger on INSERT for new submitted applications
DROP TRIGGER IF EXISTS trigger_notify_landlord_on_application_insert ON marketplace_applications;
CREATE TRIGGER trigger_notify_landlord_on_application_insert
  AFTER INSERT ON marketplace_applications
  FOR EACH ROW
  WHEN (NEW.status = 'submitted')
  EXECUTE FUNCTION notify_landlord_on_application();