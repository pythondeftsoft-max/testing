-- Add separate points-to-dollar ratio for PM/Landlords
INSERT INTO system_config (config_key, config_value, description, config_type)
VALUES ('pm_points_to_dollar_ratio', '2000'::jsonb, 'Points to dollar conversion rate for PM/Landlords (2000 points = $1.00)', 'number')
ON CONFLICT (config_key) DO NOTHING;