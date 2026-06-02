-- Fix function search paths and RLS policies for marketplace

-- 1. Drop and recreate triggers with updated functions
DROP TRIGGER IF EXISTS trigger_update_marketplace_application_timestamps ON marketplace_applications;
DROP TRIGGER IF EXISTS trigger_notify_landlord_on_application ON marketplace_applications;
DROP TRIGGER IF EXISTS trigger_notify_landlord_on_application_insert ON marketplace_applications;

DROP FUNCTION IF EXISTS public.update_marketplace_application_timestamps();
DROP FUNCTION IF EXISTS public.notify_landlord_on_application();

-- 2. Recreate functions with stable search path
CREATE OR REPLACE FUNCTION public.update_marketplace_application_timestamps()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set submitted_at when status changes to 'submitted'
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    NEW.submitted_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_landlord_on_application()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 3. Recreate triggers
CREATE TRIGGER trigger_update_marketplace_application_timestamps
  BEFORE UPDATE ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_application_timestamps();

CREATE TRIGGER trigger_notify_landlord_on_application
  AFTER UPDATE ON marketplace_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_landlord_on_application();

CREATE TRIGGER trigger_notify_landlord_on_application_insert
  AFTER INSERT ON marketplace_applications
  FOR EACH ROW
  WHEN (NEW.status = 'submitted')
  EXECUTE FUNCTION notify_landlord_on_application();

-- 4. Enable RLS and add policies
ALTER TABLE marketplace_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_events ENABLE ROW LEVEL SECURITY;

-- Marketplace applications policies
DROP POLICY IF EXISTS "Tenants can manage their own applications" ON marketplace_applications;
CREATE POLICY "Tenants can manage their own applications"
ON marketplace_applications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Property owners can view applications for their properties" ON marketplace_applications;
CREATE POLICY "Property owners can view applications for their properties"
ON marketplace_applications
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = marketplace_applications.property_id 
  AND p.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins can view all applications" ON marketplace_applications;
CREATE POLICY "Admins can view all applications"
ON marketplace_applications
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Marketplace events policies
DROP POLICY IF EXISTS "Users can insert their own events" ON marketplace_events;
CREATE POLICY "Users can insert their own events"
ON marketplace_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all events" ON marketplace_events;
CREATE POLICY "Admins can view all events"
ON marketplace_events
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));