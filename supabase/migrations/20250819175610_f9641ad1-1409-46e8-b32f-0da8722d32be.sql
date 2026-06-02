
-- 0) Ensure the portfolio-scoped permission object exists and is active
INSERT INTO public.permission_objects (name, display_name, category, scope, description, is_active)
SELECT 'portfolio.properties', 'Properties', 'portfolio', 'portfolio', 'Manage properties within a portfolio', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.permission_objects 
  WHERE name = 'portfolio.properties' AND scope = 'portfolio'
);

-- 1) Table-driven, normalized portfolio effective permissions with owner bypass
CREATE OR REPLACE FUNCTION public.get_portfolio_effective_permissions(p_user_id uuid, p_portfolio_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_role public.account_role_type;
  v_role       public.portfolio_role_type;
  v_result     jsonb;
BEGIN
  -- Account owner bypass: full portfolio permissions
  SELECT public.get_highest_account_role(p_user_id) INTO v_owner_role;
  IF v_owner_role = 'owner'::public.account_role_type THEN
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   true,
      'edit',   true,
      'delete', true,
      'create', true
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'portfolio' AND po.is_active = true;

    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

  -- Resolve user role in this portfolio
  SELECT public.get_user_portfolio_role(p_portfolio_id, p_user_id) INTO v_role;

  -- No role: all false (but include all objects with false flags so the shape is complete)
  IF v_role IS NULL THEN
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   false,
      'edit',   false,
      'delete', false,
      'create', false
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'portfolio' AND po.is_active = true;

    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

  -- Aggregate from portfolio_role_permissions joined by permission_objects.name (scope='portfolio')
  SELECT jsonb_object_agg(po.name, jsonb_build_object(
    'view',   COALESCE(prp.can_view,   false),
    'edit',   COALESCE(prp.can_edit,   false),
    'delete', COALESCE(prp.can_delete, false),
    'create', COALESCE(prp.can_create, false)
  ))
  INTO v_result
  FROM public.permission_objects po
  LEFT JOIN public.portfolio_role_permissions prp
    ON prp.permission_object_id = po.id
   AND prp.role_name = v_role
  WHERE po.scope = 'portfolio'
    AND po.is_active = true;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 2) Portfolio permission RPC with owner bypass and normalized object join
CREATE OR REPLACE FUNCTION public.has_portfolio_permission(
  p_user_id uuid,
  p_portfolio_id uuid,
  p_object text,
  p_action text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_role public.account_role_type;
  v_role public.portfolio_role_type;
  v_permission_object_id uuid;
  v_can_view boolean := false;
  v_can_edit boolean := false;
  v_can_delete boolean := false;
  v_can_create boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Account owner bypass
  SELECT public.get_highest_account_role(p_user_id) INTO v_owner_role;
  IF v_owner_role = 'owner'::public.account_role_type THEN
    RETURN true;
  END IF;

  -- User's portfolio role
  SELECT public.get_user_portfolio_role(p_portfolio_id, p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Find portfolio-scoped permission object by name
  SELECT id INTO v_permission_object_id
  FROM public.permission_objects
  WHERE name = p_object AND scope = 'portfolio'
  LIMIT 1;

  IF v_permission_object_id IS NULL THEN
    RETURN false;
  END IF;

  -- Fetch permissions
  SELECT prp.can_view, prp.can_edit, prp.can_delete, prp.can_create
  INTO v_can_view, v_can_edit, v_can_delete, v_can_create
  FROM public.portfolio_role_permissions prp
  WHERE prp.role_name = v_role
    AND prp.permission_object_id = v_permission_object_id
  LIMIT 1;

  RETURN CASE lower(p_action)
    WHEN 'view'   THEN COALESCE(v_can_view,   false)
    WHEN 'edit'   THEN COALESCE(v_can_edit,   false)
    WHEN 'delete' THEN COALESCE(v_can_delete, false)
    WHEN 'create' THEN COALESCE(v_can_create, false)
    ELSE false
  END;
END;
$$;

-- 3) Make sure authenticated clients can execute these RPCs
REVOKE ALL ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) TO authenticated;
