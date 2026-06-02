-- Fix: Update grant_portfolio_admin_role to handle NULL auth.uid() during signup
-- During signup trigger chain, auth.uid() is NULL because the user session isn't established yet
-- Solution: Use manager_id from the portfolio record as fallback

CREATE OR REPLACE FUNCTION public.grant_portfolio_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use auth.uid() if available (direct portfolio creation), 
  -- otherwise use manager_id (signup trigger context)
  v_user_id := COALESCE(auth.uid(), NEW.manager_id);
  
  -- Only proceed if we have a valid user ID
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.portfolio_roles (portfolio_id, user_id, role_name, added_by, permissions_level)
    VALUES (NEW.id, v_user_id, 'admin_partner', v_user_id, 5)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;