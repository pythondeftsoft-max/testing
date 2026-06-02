-- Create the missing has_portfolio_permission function
CREATE OR REPLACE FUNCTION public.has_portfolio_permission(
  p_user_id UUID,
  p_portfolio_id UUID,
  p_object TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role portfolio_role_type;
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Get user's role in the portfolio
  SELECT role_name INTO user_role
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
  
  -- If no role found, return false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission based on role and requested action
  SELECT 
    CASE p_action
      WHEN 'view' THEN prp.can_view
      WHEN 'edit' THEN prp.can_edit
      WHEN 'delete' THEN prp.can_delete
      WHEN 'create' THEN prp.can_create
      ELSE FALSE
    END INTO has_permission
  FROM public.portfolio_role_permissions prp
  JOIN public.permission_objects po ON prp.permission_object_id = po.id
  WHERE prp.role_name = user_role
    AND po.name = p_object
    AND po.scope = 'portfolio';
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$;