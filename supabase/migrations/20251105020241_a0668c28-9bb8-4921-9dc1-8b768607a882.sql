-- Fix Security Definer Views by recreating them with security_invoker=true
-- This prevents RLS bypass and ensures proper security

-- 1. Recreate admin_bulk_message_recipients view
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
  );

-- 2. Recreate ai_refresh_job_status view
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
WHERE jobname = 'ai-insights-refresh-daily';

-- 3. Recreate predictive_maintenance_job_status view
DROP VIEW IF EXISTS public.predictive_maintenance_job_status CASCADE;

CREATE VIEW public.predictive_maintenance_job_status
WITH (security_invoker=true)
AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  j.jobid,
  'predictive_maintenance' as job_type
FROM cron.job j 
WHERE j.jobname = 'weekly-predictive-maintenance';

-- 4. Recreate rent_payment_details view
DROP VIEW IF EXISTS public.rent_payment_details CASCADE;

CREATE VIEW public.rent_payment_details
WITH (security_invoker=true)
AS
SELECT 
  rp.id,
  rp.property_id,
  rp.tenant_id,
  rp.payment_date,
  rp.amount,
  rp.payment_source,
  rp.payment_method,
  rp.payment_type,
  rp.status,
  rp.reference_number,
  rp.notes,
  rp.recorded_by,
  rp.created_at,
  rp.updated_at,
  rp.due_date,
  rp.late_fee_amount,
  rp.days_late,
  rp.unit_id,
  rp.stripe_payment_intent_id,
  rp.stripe_session_id,
  rp.payment_status,
  rp.platform_fee_amount,
  rp.tenant_fee_amount,
  rp.net_amount_to_pm,
  rp.stripe_transfer_id,
  rp.stripe_application_fee_id,
  rp.original_rent_amount,
  rp.autopay_enabled,
  rp.autopay_payment_method_id,
  rp.autopay_setup_date,
  rp.next_autopay_date,
  rp.autopay_status,
  rp.currency_code,
  rp.exchange_rate,
  rp.original_currency_code,
  rp.original_amount,
  rp.converted_at,
  p.monthly_rent,
  p.late_fee_amount as property_late_fee,
  p.late_fee_grace_days,
  p.rent_due_day,
  CASE 
    WHEN rp.payment_date <= rp.due_date THEN 'on_time'
    WHEN rp.payment_date > rp.due_date THEN 'late'
    ELSE 'on_time'
  END as calculated_payment_timing,
  CASE 
    WHEN rp.payment_date > rp.due_date THEN 
      GREATEST(0, rp.payment_date - rp.due_date - p.late_fee_grace_days)
    ELSE 0
  END as calculated_days_late
FROM rent_payments rp
JOIN properties p ON rp.property_id = p.id;

-- Drop obsolete views that reference non-existent tables
DROP VIEW IF EXISTS public.duplicates_single_family_by_owner CASCADE;
DROP VIEW IF EXISTS public.duplicates_units CASCADE;

-- Grant appropriate permissions
GRANT SELECT ON public.admin_bulk_message_recipients TO authenticated;
GRANT SELECT ON public.ai_refresh_job_status TO authenticated;
GRANT SELECT ON public.predictive_maintenance_job_status TO authenticated;
GRANT SELECT ON public.rent_payment_details TO authenticated;

-- Add comments explaining the security model
COMMENT ON VIEW public.admin_bulk_message_recipients IS 'View for admin bulk message recipients. Uses security_invoker to enforce RLS policies from underlying tables.';
COMMENT ON VIEW public.ai_refresh_job_status IS 'View for AI refresh job monitoring. Uses security_invoker to enforce user permissions.';
COMMENT ON VIEW public.predictive_maintenance_job_status IS 'View for predictive maintenance job monitoring. Uses security_invoker to enforce user permissions.';
COMMENT ON VIEW public.rent_payment_details IS 'View for rent payment details with calculated statuses. Uses security_invoker to enforce RLS policies.';