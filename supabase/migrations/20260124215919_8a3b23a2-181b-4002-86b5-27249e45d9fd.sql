-- Enable SEO automation
UPDATE public.system_config 
SET config_value = 'true', updated_at = now() 
WHERE config_key = 'seo_automation_enabled';