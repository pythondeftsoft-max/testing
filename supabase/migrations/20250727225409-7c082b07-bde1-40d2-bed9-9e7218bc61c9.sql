-- Fix inconsistent property states and add data consistency function
CREATE OR REPLACE FUNCTION public.fix_inconsistent_property_states()
RETURNS TABLE(fixed_properties_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Fix properties that are 'available' but have no tenant requests and no desired rent
  UPDATE public.properties 
  SET status = 'vacant',
      updated_at = now()
  WHERE status = 'available' 
    AND (tenant_request_count = 0 OR tenant_request_count IS NULL)
    AND (desired_rent = 0 OR desired_rent IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM public.property_tenant_requests 
      WHERE property_id = properties.id AND status = 'active'
    );
    
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  
  -- Sync tenant_request_count with actual requests
  UPDATE public.properties 
  SET tenant_request_count = (
    SELECT COUNT(*) 
    FROM public.property_tenant_requests 
    WHERE property_id = properties.id AND status = 'active'
  ),
  updated_at = now()
  WHERE tenant_request_count != (
    SELECT COUNT(*) 
    FROM public.property_tenant_requests 
    WHERE property_id = properties.id AND status = 'active'
  );
  
  RETURN QUERY SELECT fixed_count;
END;
$function$;

-- Run the fix immediately
SELECT * FROM public.fix_inconsistent_property_states();

-- Add validation trigger to prevent future inconsistencies
CREATE OR REPLACE FUNCTION public.validate_property_status_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If setting status to 'available', ensure we have either tenant requests or desired rent
  IF NEW.status = 'available' THEN
    IF (NEW.tenant_request_count = 0 OR NEW.tenant_request_count IS NULL) 
       AND (NEW.desired_rent = 0 OR NEW.desired_rent IS NULL) THEN
      -- Check if there are actual tenant requests
      IF NOT EXISTS (
        SELECT 1 FROM public.property_tenant_requests 
        WHERE property_id = NEW.id AND status = 'active'
      ) THEN
        -- Force status back to vacant if no supporting data
        NEW.status = 'vacant';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for property status validation
DROP TRIGGER IF EXISTS validate_property_status_trigger ON public.properties;
CREATE TRIGGER validate_property_status_trigger
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_property_status_consistency();