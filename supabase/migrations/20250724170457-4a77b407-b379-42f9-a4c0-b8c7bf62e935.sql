-- Add new fields to white_label_configs table for enhanced functionality
ALTER TABLE public.white_label_configs 
ADD COLUMN IF NOT EXISTS theme_preset text DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS landing_page_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_template_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS advanced_customization jsonb DEFAULT '{}';