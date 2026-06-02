-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily autopay reminder function to run at 9:00 UTC every day
SELECT cron.schedule(
  'send-daily-autopay-reminders',
  '0 9 * * *', -- 9:00 AM UTC daily
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/send-autopay-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Add RLS policies for asset_autopay_schedules if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        WHERE c.oid = 'public.asset_autopay_schedules'::regclass 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.asset_autopay_schedules ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Tenants can manage their own autopay schedules" ON public.asset_autopay_schedules;
DROP POLICY IF EXISTS "Property owners can view autopay schedules" ON public.asset_autopay_schedules;
DROP POLICY IF EXISTS "Portfolio managers can manage autopay schedules" ON public.asset_autopay_schedules;

-- Tenants can manage their own autopay schedules
CREATE POLICY "Tenants can manage their own autopay schedules"
  ON public.asset_autopay_schedules
  FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Property owners can view autopay schedules for their properties
CREATE POLICY "Property owners can view autopay schedules"
  ON public.asset_autopay_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_autopay_schedules.asset_id
      AND (
        pa.portfolio_id IN (
          SELECT portfolio_id FROM public.portfolio_roles
          WHERE user_id = auth.uid() 
          AND role_name IN ('admin_partner', 'editor', 'viewer')
          AND is_active = true
        )
      )
    )
  );

-- Portfolio managers can manage autopay schedules for their portfolios
CREATE POLICY "Portfolio managers can manage autopay schedules"
  ON public.asset_autopay_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_autopay_schedules.asset_id
      AND (
        pa.portfolio_id IN (
          SELECT portfolio_id FROM public.portfolio_roles
          WHERE user_id = auth.uid() 
          AND role_name IN ('admin_partner', 'editor')
          AND is_active = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolio_assets pa
      WHERE pa.id = asset_autopay_schedules.asset_id
      AND (
        pa.portfolio_id IN (
          SELECT portfolio_id FROM public.portfolio_roles
          WHERE user_id = auth.uid() 
          AND role_name IN ('admin_partner', 'editor')
          AND is_active = true
        )
      )
    )
  );