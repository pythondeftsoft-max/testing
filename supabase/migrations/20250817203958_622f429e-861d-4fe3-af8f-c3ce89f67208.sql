
-- Phase 6: Backend hardening (RLS + RPC consolidation)
-- 1) Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permission_objects_name_scope
  ON public.permission_objects (name, scope);

-- 2) Account-scope permission check
CREATE OR REPLACE FUNCTION public.has_account_permission(
  p_user_id uuid,
  p_object text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_role public.account_role_type;
  v_permission_object_id uuid;
  v_can_view boolean := false;
  v_can_edit boolean := false;
  v_can_delete boolean := false;
  v_can_create boolean := false;
BEGIN
  -- Admin bypass
  SELECT public.is_admin(p_user_id) INTO v_is_admin;
  IF COALESCE(v_is_admin, false) THEN
    RETURN true;
  END IF;

  -- Highest account role
  SELECT public.get_highest_account_role(p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Find permission object
  SELECT id
  INTO v_permission_object_id
  FROM public.permission_objects
  WHERE name = p_object
    AND scope = 'account'
  LIMIT 1;

  IF v_permission_object_id IS NULL THEN
    RETURN false;
  END IF;

  -- Fetch permissions for role/object
  SELECT arp.can_view, arp.can_edit, arp.can_delete, arp.can_create
  INTO v_can_view, v_can_edit, v_can_delete, v_can_create
  FROM public.account_role_permissions arp
  WHERE arp.role_name = v_role
    AND arp.permission_object_id = v_permission_object_id
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

-- 3) Portfolio-scope permission check
CREATE OR REPLACE FUNCTION public.has_portfolio_permission(
  p_user_id uuid,
  p_portfolio_id uuid,
  p_object text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_role public.portfolio_role_type;
  v_permission_object_id uuid;
  v_can_view boolean := false;
  v_can_edit boolean := false;
  v_can_delete boolean := false;
  v_can_create boolean := false;
BEGIN
  -- Admin bypass
  SELECT public.is_admin(p_user_id) INTO v_is_admin;
  IF COALESCE(v_is_admin, false) THEN
    RETURN true;
  END IF;

  -- Determine user's portfolio role
  SELECT public.get_user_portfolio_role(p_portfolio_id, p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Find permission object
  SELECT id
  INTO v_permission_object_id
  FROM public.permission_objects
  WHERE name = p_object
    AND scope = 'portfolio'
  LIMIT 1;

  IF v_permission_object_id IS NULL THEN
    RETURN false;
  END IF;

  -- Fetch permissions for role/object
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

-- 4) Consolidated effective permissions (portfolio)
CREATE OR REPLACE FUNCTION public.get_portfolio_effective_permissions(
  p_user_id uuid,
  p_portfolio_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_role public.portfolio_role_type;
  v_result jsonb;
BEGIN
  SELECT public.is_admin(p_user_id) INTO v_is_admin;
  IF COALESCE(v_is_admin, false) THEN
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   true,
      'edit',   true,
      'delete', true,
      'create', true
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'portfolio';
    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

  SELECT public.get_user_portfolio_role(p_portfolio_id, p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    -- No role: all false
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   false,
      'edit',   false,
      'delete', false,
      'create', false
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'portfolio';
    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

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
  WHERE po.scope = 'portfolio';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 5) Consolidated effective permissions (account)
CREATE OR REPLACE FUNCTION public.get_account_effective_permissions(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_role public.account_role_type;
  v_result jsonb;
BEGIN
  SELECT public.is_admin(p_user_id) INTO v_is_admin;
  IF COALESCE(v_is_admin, false) THEN
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   true,
      'edit',   true,
      'delete', true,
      'create', true
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'account';
    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

  SELECT public.get_highest_account_role(p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    SELECT jsonb_object_agg(po.name, jsonb_build_object(
      'view',   false,
      'edit',   false,
      'delete', false,
      'create', false
    ))
    INTO v_result
    FROM public.permission_objects po
    WHERE po.scope = 'account';
    RETURN COALESCE(v_result, '{}'::jsonb);
  END IF;

  SELECT jsonb_object_agg(po.name, jsonb_build_object(
    'view',   COALESCE(arp.can_view,   false),
    'edit',   COALESCE(arp.can_edit,   false),
    'delete', COALESCE(arp.can_delete, false),
    'create', COALESCE(arp.can_create, false)
  ))
  INTO v_result
  FROM public.permission_objects po
  LEFT JOIN public.account_role_permissions arp
    ON arp.permission_object_id = po.id
   AND arp.role_name = v_role
  WHERE po.scope = 'account';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 6) Tighten GRANTs for the new/updated RPCs
-- Revoke from PUBLIC/anon, grant to authenticated
DO $$
BEGIN
  -- has_account_permission
  REVOKE ALL ON FUNCTION public.has_account_permission(uuid, text, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.has_account_permission(uuid, text, text) FROM anon;
  GRANT EXECUTE ON FUNCTION public.has_account_permission(uuid, text, text) TO authenticated;

  -- has_portfolio_permission
  REVOKE ALL ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) FROM anon;
  GRANT EXECUTE ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) TO authenticated;

  -- get_portfolio_effective_permissions
  REVOKE ALL ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) FROM anon;
  GRANT EXECUTE ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) TO authenticated;

  -- get_account_effective_permissions
  REVOKE ALL ON FUNCTION public.get_account_effective_permissions(uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.get_account_effective_permissions(uuid) FROM anon;
  GRANT EXECUTE ON FUNCTION public.get_account_effective_permissions(uuid) TO authenticated;
END $$;
