-- Create a function to check if user can access a property based on portfolio isolation
CREATE OR REPLACE FUNCTION public.can_access_property_in_portfolio(property_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  property_portfolio_id uuid;
  property_owner_id uuid;
BEGIN
  -- Get property details
  SELECT portfolio_id, owner_id 
  INTO property_portfolio_id, property_owner_id
  FROM public.properties 
  WHERE id = property_id;
  
  -- If property doesn't exist, deny access
  IF property_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- If user is admin, allow access
  IF is_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- If user is the property owner, allow access
  IF property_owner_id = user_id THEN
    RETURN true;
  END IF;
  
  -- If property has no portfolio, only owner can access
  IF property_portfolio_id IS NULL THEN
    RETURN property_owner_id = user_id;
  END IF;
  
  -- Check if user is the portfolio manager
  IF EXISTS (
    SELECT 1 FROM public.portfolios 
    WHERE id = property_portfolio_id 
    AND manager_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update the properties RLS policy to use portfolio-aware access control
DROP POLICY IF EXISTS "Owners can read their properties" ON public.properties;

CREATE POLICY "Users can view properties they have access to"
ON public.properties
FOR SELECT
USING (
  can_access_property_in_portfolio(id, auth.uid()) 
  AND deleted_at IS NULL
);