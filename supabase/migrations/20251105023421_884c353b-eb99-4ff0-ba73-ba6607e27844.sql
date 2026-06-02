-- Add new configuration options for PM/Landlord Points rent collection
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('pm_rent_points_mode', '"fixed"', 'text', 'Rent points calculation mode: "fixed" or "dollar_based"'),
('pm_points_per_rent_dollar', '0.1', 'number', 'Points awarded per dollar of rent collected (dollar-based mode only)'),
('pm_rent_points_min', '10', 'number', 'Minimum points for rent collection (dollar-based mode only)'),
('pm_rent_points_max', '500', 'number', 'Maximum points for rent collection (dollar-based mode only)')
ON CONFLICT (config_key) DO NOTHING;