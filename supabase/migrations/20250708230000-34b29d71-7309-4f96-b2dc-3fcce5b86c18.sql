-- Add latitude and longitude columns to properties table for geocoding
ALTER TABLE public.properties 
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- Create index for spatial queries
CREATE INDEX idx_properties_coordinates ON public.properties(latitude, longitude);

-- Create geocoding function to update property coordinates
CREATE OR REPLACE FUNCTION public.geocode_property_address(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_address text;
BEGIN
  -- Get full address for the property
  SELECT CONCAT_WS(', ', street_address, city, state, zipcode)
  INTO property_address
  FROM public.properties 
  WHERE id = property_id;
  
  -- Note: This function sets up the structure
  -- The actual geocoding will be handled by an edge function
  -- to avoid making external API calls directly from the database
  
  -- Log the geocoding request
  INSERT INTO public.notifications (user_id, title, description, type)
  SELECT 
    owner_id,
    'Property Geocoding',
    'Geocoding requested for property at: ' || property_address,
    'info'
  FROM public.properties 
  WHERE id = property_id;
END;
$$;

-- Create trigger to automatically request geocoding for new properties
CREATE OR REPLACE FUNCTION public.trigger_geocode_new_property()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only trigger if address fields are present and coordinates are missing
  IF (NEW.street_address IS NOT NULL OR NEW.city IS NOT NULL) 
     AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    
    -- Call the geocoding function
    PERFORM public.geocode_property_address(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_geocode_property_on_insert ON public.properties;
CREATE TRIGGER trigger_geocode_property_on_insert
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_geocode_new_property();

-- Create trigger for address updates
DROP TRIGGER IF EXISTS trigger_geocode_property_on_update ON public.properties;
CREATE TRIGGER trigger_geocode_property_on_update
  AFTER UPDATE OF street_address, city, state, zipcode ON public.properties
  FOR EACH ROW
  WHEN (OLD.street_address IS DISTINCT FROM NEW.street_address 
        OR OLD.city IS DISTINCT FROM NEW.city 
        OR OLD.state IS DISTINCT FROM NEW.state 
        OR OLD.zipcode IS DISTINCT FROM NEW.zipcode)
  EXECUTE FUNCTION public.trigger_geocode_new_property();