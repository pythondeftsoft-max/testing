-- Add placement fee configuration to platform_configs
INSERT INTO public.platform_configs (config_key, config_value, description)
VALUES (
  'placement_fee_config',
  '{"percentage": 40, "min_fee": 0, "max_fee": null, "notes": "Standard placement fee for tenant matchmaking services"}'::jsonb,
  'Configuration for landlord placement fees charged for successful tenant placements'
)
ON CONFLICT (config_key) DO NOTHING;