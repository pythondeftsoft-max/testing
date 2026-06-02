
-- ============================================================
-- Phase 1: critical RLS hardening (additive, non-destructive)
-- ============================================================

-- ---------- HAP PAYMENTS ----------
-- Drop the three broken policies (s.agency_id = s.agency_id tautology)
DROP POLICY IF EXISTS "Agency staff can view hap_payments" ON public.hap_payments;
DROP POLICY IF EXISTS "Agency admins can update hap_payments" ON public.hap_payments;
DROP POLICY IF EXISTS "Agency staff can insert hap_payments" ON public.hap_payments;

-- Helper: check whether the calling agency-staff user shares an agency
-- with the tenant on a given hap_payments row.
CREATE OR REPLACE FUNCTION public.agency_staff_can_access_hap_payment(
  _user_id uuid,
  _tenant_id uuid,
  _required_roles agency_role[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_staff s
    JOIN public.agency_tenant_links l
      ON l.agency_id = s.agency_id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND l.user_id = _tenant_id
      AND (_required_roles IS NULL OR s.role = ANY(_required_roles))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.agency_staff_can_access_hap_payment(uuid, uuid, agency_role[]) FROM anon;

-- Recreate scoped policies
CREATE POLICY "Agency staff can view hap_payments"
ON public.hap_payments
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND public.agency_staff_can_access_hap_payment(auth.uid(), tenant_id, NULL)
);

CREATE POLICY "Agency admins can update hap_payments"
ON public.hap_payments
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND public.agency_staff_can_access_hap_payment(auth.uid(), tenant_id, ARRAY['agency_admin'::agency_role])
);

CREATE POLICY "Agency staff can insert hap_payments"
ON public.hap_payments
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND public.agency_staff_can_access_hap_payment(
    auth.uid(),
    tenant_id,
    ARRAY['agency_admin'::agency_role, 'caseworker'::agency_role]
  )
);

-- ---------- AGENT INTERNAL TABLES ----------
DROP POLICY IF EXISTS "Authenticated read agent_memory" ON public.agent_memory;
DROP POLICY IF EXISTS "Authenticated read agent_tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Authenticated read agent_activity_logs" ON public.agent_activity_logs;
-- Admin-only "Admins full access agent_*" policies remain.

-- ---------- BREACH NOTIFICATIONS ----------
DROP POLICY IF EXISTS "Public can read by token for ack" ON public.breach_notifications;

CREATE OR REPLACE FUNCTION public.get_breach_notification_by_token(_token text)
RETURNS TABLE (
  id uuid,
  acknowledged_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bn.id, bn.acknowledged_at
  FROM public.breach_notifications bn
  WHERE bn.acknowledgement_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_breach_notification(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  UPDATE public.breach_notifications
     SET acknowledged_at = COALESCE(acknowledged_at, now())
   WHERE acknowledgement_token = _token
   RETURNING id INTO _id;
  RETURN _id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_breach_notification_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_breach_notification(text) TO anon, authenticated;

-- ---------- ROLE PERMISSIONS ----------
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
-- "Authenticated can view role permissions" remains.

-- ---------- AI MODEL METRICS ----------
DROP POLICY IF EXISTS "ai_model_metrics_user_select" ON public.ai_model_metrics;

CREATE POLICY "ai_model_metrics_user_select"
ON public.ai_model_metrics
FOR SELECT
TO authenticated
USING (
  (portfolio_id IS NOT NULL
    AND has_portfolio_role(
      portfolio_id,
      auth.uid(),
      ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]
    ))
  OR (portfolio_id IS NULL AND is_admin(auth.uid()))
);

-- ---------- GROWTH GOALS / SNAPSHOTS ----------
DROP POLICY IF EXISTS "Authenticated users can view growth goals" ON public.growth_goals;
DROP POLICY IF EXISTS "Authenticated users can view growth snapshots" ON public.growth_snapshots;
-- "Admins can manage" policies remain.
