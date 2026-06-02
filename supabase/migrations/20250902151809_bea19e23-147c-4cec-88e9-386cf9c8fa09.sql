-- Fix security issue: Replace service_role token with anon key in cron job
-- Drop existing cron job
SELECT cron.unschedule('weekly-predictive-maintenance');

-- Create secure weekly cron job for predictive maintenance (runs every Sunday at 3:00 AM)
-- This will call the ai-predictive-maintenance function for active portfolios
SELECT cron.schedule(
  'weekly-predictive-maintenance',
  '0 3 * * 0', -- Every Sunday at 3:00 AM
  $$
  select
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/ai-predictive-maintenance',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:=jsonb_build_object(
          'portfolioId', null,
          'scheduledRun', true,
          'runTime', now()::text
        )
    ) as request_id;
  $$
);