-- Update the handle_tenant_request_status function to also update tenant_request_count
CREATE OR REPLACE FUNCTION public.handle_tenant_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- When a tenant request is created, set property status to available and increment count
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.properties
    SET status = 'available',
        tenant_request_count = tenant_request_count + 1,
        updated_at = now()
    WHERE id = NEW.property_id;
  -- When a tenant request is deactivated, decrement count  
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE public.properties
    SET tenant_request_count = GREATEST(tenant_request_count - 1, 0),
        updated_at = now()
    WHERE id = NEW.property_id;
    
    -- If no more active requests, set status back to vacant if no desired_rent
    IF NOT EXISTS (
      SELECT 1 FROM public.property_tenant_requests 
      WHERE property_id = NEW.property_id AND status = 'active'
    ) THEN
      UPDATE public.properties
      SET status = CASE 
        WHEN desired_rent IS NULL OR desired_rent = 0 THEN 'vacant'
        ELSE 'available'
      END
      WHERE id = NEW.property_id;
    END IF;
  -- When a tenant request is deleted, decrement count
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.properties
    SET tenant_request_count = GREATEST(tenant_request_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.property_id;
    
    -- If no more active requests, set status back to vacant if no desired_rent
    IF NOT EXISTS (
      SELECT 1 FROM public.property_tenant_requests 
      WHERE property_id = OLD.property_id AND status = 'active'
    ) THEN
      UPDATE public.properties
      SET status = CASE 
        WHEN desired_rent IS NULL OR desired_rent = 0 THEN 'vacant'
        ELSE 'available'
      END
      WHERE id = OLD.property_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;