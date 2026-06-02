-- ===========================================
-- FIX: Restrict admin_bulk_message_recipients view
-- ===========================================

-- Revoke public access to the view
REVOKE ALL ON public.admin_bulk_message_recipients FROM anon;
REVOKE ALL ON public.admin_bulk_message_recipients FROM authenticated;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  );
$$;

-- Drop and recreate view with admin-only access
DROP VIEW IF EXISTS public.admin_bulk_message_recipients CASCADE;

CREATE VIEW public.admin_bulk_message_recipients 
WITH (security_invoker=true)
AS
SELECT 
  am.id as message_id,
  am.subject,
  am.message_text,
  am.message_type,
  am.recipient_group,
  am.created_at,
  p.id as recipient_user_id,
  p.first_name,
  p.last_name,
  p.user_type
FROM admin_messages am
CROSS JOIN profiles p
WHERE am.recipient_group IS NOT NULL
  AND (
    (am.recipient_group = 'all_users') OR
    (am.recipient_group = 'landlords' AND p.user_type = 'landlord') OR
    (am.recipient_group = 'tenants' AND p.user_type = 'tenant')
  )
  AND public.is_admin_user();

GRANT SELECT ON public.admin_bulk_message_recipients TO authenticated;

-- ===========================================
-- FIX: Restrict ai_refresh_job_status view
-- ===========================================

REVOKE ALL ON public.ai_refresh_job_status FROM anon;
REVOKE ALL ON public.ai_refresh_job_status FROM authenticated;

DROP VIEW IF EXISTS public.ai_refresh_job_status CASCADE;

CREATE VIEW public.ai_refresh_job_status
WITH (security_invoker=true)
AS
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname IN ('ai-insights-refresh-daily', 'predictive-maintenance-daily')
  AND public.is_admin_user();

GRANT SELECT ON public.ai_refresh_job_status TO authenticated;