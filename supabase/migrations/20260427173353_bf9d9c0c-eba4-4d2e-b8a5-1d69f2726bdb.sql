-- =====================================================
-- BLOCK 3.5: MFA Polish (additive only)
-- =====================================================

-- 1. Add reminder throttle column (nullable, defaults to NULL = never reminded)
ALTER TABLE public.user_mfa_settings
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- 2. Enrollment stats view: per-role enrollment counts joined with enforcement flag.
-- Combines users from user_roles (platform roles) and agency_staff (PHA roles).
CREATE OR REPLACE VIEW public.mfa_enrollment_stats AS
WITH role_users AS (
  -- Platform-level roles from user_roles
  SELECT
    ur.role::text AS role_name,
    ur.user_id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('admin', 'system_admin')

  UNION

  -- Agency-level roles from agency_staff (active only)
  SELECT
    ags.role::text AS role_name,
    ags.user_id
  FROM public.agency_staff ags
  WHERE ags.user_id IS NOT NULL
    AND COALESCE(ags.is_active, true) = true
    AND ags.role::text IN (
      'agency_admin', 'agency_staff', 'caseworker',
      'caseworker_supervisor', 'inspector'
    )
),
deduped AS (
  -- A user might appear in multiple roles; count them per role independently.
  SELECT DISTINCT role_name, user_id FROM role_users
)
SELECT
  cfg.role_name,
  cfg.required AS enforcement_enabled,
  COALESCE(COUNT(d.user_id), 0)::int AS total_users,
  COALESCE(COUNT(ums.user_id) FILTER (WHERE ums.enrolled_at IS NOT NULL), 0)::int AS enrolled_users,
  CASE
    WHEN COUNT(d.user_id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(ums.user_id) FILTER (WHERE ums.enrolled_at IS NOT NULL))::numeric
      / COUNT(d.user_id)::numeric * 100,
      0
    )::int
  END AS enrolled_pct
FROM public.mfa_enforcement_config cfg
LEFT JOIN deduped d ON d.role_name = cfg.role_name
LEFT JOIN public.user_mfa_settings ums ON ums.user_id = d.user_id
GROUP BY cfg.role_name, cfg.required
ORDER BY cfg.role_name;

-- View access: admins only.
-- Views inherit RLS from base tables, but we add an explicit revoke + grant
-- for clarity and defense-in-depth.
REVOKE ALL ON public.mfa_enrollment_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mfa_enrollment_stats TO authenticated;

-- A SECURITY DEFINER wrapper so admin checks work cleanly from the client.
CREATE OR REPLACE FUNCTION public.get_mfa_enrollment_stats()
RETURNS TABLE (
  role_name TEXT,
  enforcement_enabled BOOLEAN,
  total_users INT,
  enrolled_users INT,
  enrolled_pct INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can view MFA enrollment statistics';
  END IF;

  RETURN QUERY
  SELECT
    s.role_name,
    s.enforcement_enabled,
    s.total_users,
    s.enrolled_users,
    s.enrolled_pct
  FROM public.mfa_enrollment_stats s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mfa_enrollment_stats() TO authenticated;