-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create weekly cron job for predictive maintenance (runs every Sunday at 3:00 AM)
-- This will call the ai-predictive-maintenance function for active portfolios
SELECT cron.schedule(
  'weekly-predictive-maintenance',
  '0 3 * * 0', -- Every Sunday at 3:00 AM
  $$
  select
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/ai-predictive-maintenance',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTAzNDY0OCwiZXhwIjoyMDY2NjEwNjQ4fQ.qOjIw5s6qUj1s2BQVH6v9ZQ6cZj2qQ8v-6UY9MsB0Ck"}'::jsonb,
        body:=jsonb_build_object(
          'portfolioId', null,
          'scheduledRun', true,
          'runTime', now()::text
        )
    ) as request_id;
  $$
);

-- Add system configuration for predictive maintenance scheduling
INSERT INTO public.system_config (config_key, config_value, description) 
VALUES (
  'predictive_maintenance_config',
  '{
    "enabled": true,
    "schedule": "weekly",
    "cron_expression": "0 3 * * 0",
    "auto_run": true,
    "max_properties_per_run": 100,
    "cache_ttl_hours": 168
  }'::jsonb,
  'Configuration for AI predictive maintenance scheduling and execution'
) ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Create view for predictive maintenance job status
CREATE OR REPLACE VIEW public.predictive_maintenance_job_status AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  j.jobid,
  'predictive_maintenance' as job_type
FROM cron.job j 
WHERE j.jobname = 'weekly-predictive-maintenance';

-- Grant select permissions on the view
GRANT SELECT ON public.predictive_maintenance_job_status TO authenticated;