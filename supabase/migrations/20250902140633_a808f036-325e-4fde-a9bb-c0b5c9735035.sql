-- Setup cron job for AI insights refresh
-- This will run the ai-insights-refresh function daily at 2 AM

-- First, enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the AI insights refresh job to run daily at 2:00 AM
SELECT cron.schedule(
  'ai-insights-refresh-daily',
  '0 2 * * *', -- At 2:00 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/ai-insights-refresh',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:='{"scheduled": true, "job_type": "daily_refresh"}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger the refresh (for testing/admin use)
CREATE OR REPLACE FUNCTION public.trigger_ai_insights_refresh()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the edge function directly
  SELECT net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/ai-insights-refresh',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body:='{"manual_trigger": true}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Add comment to track the cron job
COMMENT ON FUNCTION public.trigger_ai_insights_refresh() IS 'Manual trigger for AI insights refresh job. Scheduled version runs daily at 2 AM via pg_cron.';

-- Create view to monitor cron job status (for admins)
CREATE OR REPLACE VIEW public.ai_refresh_job_status AS
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname = 'ai-insights-refresh-daily';