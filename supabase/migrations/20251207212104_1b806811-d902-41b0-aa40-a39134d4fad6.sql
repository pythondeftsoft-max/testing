-- Insert missing points earning rate config entries
INSERT INTO system_config (config_key, config_value, config_type, description)
VALUES 
  ('pm_points_per_dollar', '2', 'number', 'How many points landlords/PMs earn per $1 of rent collected'),
  ('tenant_points_per_dollar', '1', 'number', 'How many points tenants earn per $1 of rent paid')
ON CONFLICT (config_key) DO NOTHING;