-- Phase 4: Database Enhancements for Portfolio Role Management

-- Step 4.1: Add RLS Policy for cross-portfolio role viewing
-- Allow users to view roles across portfolios they have access to
CREATE POLICY "Users can view roles in portfolios they have access to"
ON public.portfolio_roles
FOR SELECT
USING (
  -- User can see their own role in any portfolio
  user_id = auth.uid() 
  OR 
  -- Admin partners can see all roles in portfolios they manage
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
  OR
  -- Editors can see all roles in portfolios they have editor access to
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

-- Step 4.2: Add Portfolio Access Validation Function
-- Function to validate if a user can access portfolio data
CREATE OR REPLACE FUNCTION public.can_access_portfolio(p_portfolio_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Return true if user has any role in the portfolio or is an admin
  RETURN (
    -- User is an admin
    is_admin(p_user_id) 
    OR 
    -- User has a role in this portfolio
    EXISTS (
      SELECT 1 FROM public.portfolio_roles 
      WHERE portfolio_id = p_portfolio_id 
      AND user_id = p_user_id 
      AND is_active = true
    )
    OR
    -- User is the portfolio manager
    EXISTS (
      SELECT 1 FROM public.portfolios 
      WHERE id = p_portfolio_id 
      AND manager_id = p_user_id
    )
  );
END;
$function$;

-- Step 4.3: Add Enhanced Role Query Function
-- Function to get detailed role information for debugging and analytics
CREATE OR REPLACE FUNCTION public.get_user_portfolio_role_details(p_portfolio_id UUID, p_user_id UUID)
RETURNS TABLE(
  role_name portfolio_role_type,
  role_tag text,
  permissions_level integer,
  added_by uuid,
  created_at timestamp with time zone,
  is_active boolean,
  can_access boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pr.role_name,
    pr.role_tag,
    pr.permissions_level,
    pr.added_by,
    pr.created_at,
    pr.is_active,
    can_access_portfolio(p_portfolio_id, p_user_id) as can_access
  FROM public.portfolio_roles pr
  WHERE pr.portfolio_id = p_portfolio_id
  AND pr.user_id = p_user_id
  AND pr.is_active = true
  ORDER BY 
    CASE pr.role_name 
      WHEN 'admin_partner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
      WHEN 'maintenance' THEN 4
    END
  LIMIT 1;
END;
$function$;