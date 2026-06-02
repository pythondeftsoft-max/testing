-- Remove direct view access; the function is the only entrypoint.
REVOKE ALL ON public.mfa_enrollment_stats FROM PUBLIC, anon, authenticated;
DROP VIEW IF EXISTS public.mfa_enrollment_stats;

-- Replace the function so it computes inline (no view dependency).
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
  WITH role_users AS (
    SELECT ur.role::text AS rname, ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text IN ('admin', 'system_admin')
    UNION
    SELECT ags.role::text AS rname, ags.user_id
    FROM public.agency_staff ags
    WHERE ags.user_id IS NOT NULL
      AND COALESCE(ags.is_active, true) = true
      AND ags.role::text IN (
        'agency_admin', 'agency_staff', 'caseworker',
        'caseworker_supervisor', 'inspector'
      )
  ),
  deduped AS (
    SELECT DISTINCT rname, user_id FROM role_users
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
  LEFT JOIN deduped d ON d.rname = cfg.role_name
  LEFT JOIN public.user_mfa_settings ums ON ums.user_id = d.user_id
  GROUP BY cfg.role_name, cfg.required
  ORDER BY cfg.role_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mfa_enrollment_stats() TO authenticated;