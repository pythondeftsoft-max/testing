
-- Fix maintenance request notification to handle NULL property_owner_id
-- This prevents "null value in column user_id violates not-null constraint" error

CREATE OR REPLACE FUNCTION public.handle_maintenance_request_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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

  -- Only notify property owner if one exists (INSERT operation)
  IF TG_OP = 'INSERT' AND property_owner_id IS NOT NULL THEN
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
  END IF;

  -- Keep status change notifications (only if tenant exists)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' AND NEW.tenant_id IS NOT NULL THEN
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
$function$;
