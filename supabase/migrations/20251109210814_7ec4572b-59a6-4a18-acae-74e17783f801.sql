-- Fix handle_new_notification to include to_email
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
BEGIN
  -- Fetch the user's email from profiles
  SELECT email INTO user_email
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Only insert into email_queue if we have a valid email
  IF user_email IS NOT NULL THEN
    INSERT INTO public.email_queue (user_id, to_email, subject, body, link, email_type, audience)
    VALUES (
      NEW.user_id,
      user_email,
      NEW.title,
      CONCAT(NEW.description, ' - ', to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS')),
      COALESCE(NEW.link, '/messages?tab=notifications'),
      'custom',
      'landlord'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remove notification from geocoding function
CREATE OR REPLACE FUNCTION public.geocode_property_address(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  
  -- Removed notification insert - geocoding is a background operation
  -- that doesn't require user notification
END;
$$;