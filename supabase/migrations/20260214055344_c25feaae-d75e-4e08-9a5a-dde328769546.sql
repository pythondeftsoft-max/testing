
INSERT INTO public.system_config (config_key, config_value, description, config_type)
VALUES ('sms_system_enabled', 'false'::jsonb, 'Master toggle for SMS messaging system. Set to true when Twilio is approved.', 'boolean')
ON CONFLICT (config_key) DO NOTHING;
