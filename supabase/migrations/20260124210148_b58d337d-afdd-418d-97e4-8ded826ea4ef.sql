-- Add SEO automation configuration entries
INSERT INTO system_config (config_key, config_value, description, config_type)
VALUES 
  ('seo_posts_per_day', '1', 'Number of SEO blog posts to generate per day (1-4 recommended)', 'integer'),
  ('seo_generation_hour_utc', '6', 'Hour in UTC to trigger daily generation (0-23)', 'integer'),
  ('seo_auto_publish', 'true', 'Whether to auto-publish generated posts or save as draft', 'boolean'),
  ('seo_min_hours_between_posts', '6', 'Minimum hours between post generations to prevent duplicates', 'integer'),
  ('seo_automation_enabled', 'false', 'Master toggle for automated SEO post generation', 'boolean')
ON CONFLICT (config_key) DO UPDATE SET
  description = EXCLUDED.description,
  config_type = EXCLUDED.config_type,
  updated_at = now();

-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily SEO blog post generation at 6 AM UTC
-- This triggers the generate-seo-blog-post edge function
SELECT cron.schedule(
  'generate-daily-seo-blog-post',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/generate-seo-blog-post',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4'
    ),
    body:=jsonb_build_object('source', 'scheduled', 'run_id', gen_random_uuid()::text)
  );
  $$
);