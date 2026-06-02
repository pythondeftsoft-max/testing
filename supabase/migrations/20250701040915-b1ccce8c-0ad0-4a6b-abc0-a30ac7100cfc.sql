
-- Add a column to track tenant request count on properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS tenant_request_count INTEGER DEFAULT 0;

-- Create a trigger function to automatically update the count
CREATE OR REPLACE FUNCTION update_tenant_request_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.properties 
    SET tenant_request_count = tenant_request_count + 1 
    WHERE id = NEW.property_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.properties 
    SET tenant_request_count = GREATEST(tenant_request_count - 1, 0) 
    WHERE id = OLD.property_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on viewing_appointments table
DROP TRIGGER IF EXISTS tenant_request_count_trigger ON public.viewing_appointments;
CREATE TRIGGER tenant_request_count_trigger
  AFTER INSERT OR DELETE ON public.viewing_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_request_count();
