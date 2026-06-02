-- Add earning rate configs for tenants and landlords
-- This defines how many dollars spent/collected equals $1 worth of points

INSERT INTO system_config (config_key, config_value, description, config_type)
VALUES 
  ('tenant_dollars_per_point_dollar', '100'::jsonb, 'Dollars spent to earn $1 worth of points for tenants (e.g., 100 = 1% cashback)', 'number'),
  ('pm_dollars_per_point_dollar', '100'::jsonb, 'Dollars collected to earn $1 worth of points for PMs/Landlords (e.g., 100 = 1% cashback)', 'number')
ON CONFLICT (config_key) DO NOTHING;