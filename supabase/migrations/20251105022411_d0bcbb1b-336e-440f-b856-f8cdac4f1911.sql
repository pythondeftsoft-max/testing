-- Add property management points configuration entries
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
-- Core Activity Rewards
('pm_points_rent_payment', '50', 'number', 'Base points awarded for rent payment processing'),
('pm_points_lease_signing', '100', 'number', 'Points awarded for new lease signing'),
('pm_points_maintenance_completion', '25', 'number', 'Points awarded for completing maintenance requests'),
('pm_points_property_inspection', '30', 'number', 'Points awarded for property inspection completion'),
('pm_points_lease_renewal', '60', 'number', 'Base points awarded for lease renewal'),

-- Bonus Multipliers
('pm_bonus_early_payment_multiplier', '1.2', 'number', 'Multiplier applied to rent payment points when paid early'),
('pm_bonus_retention_max_multiplier', '2.0', 'number', 'Maximum multiplier for lease retention (based on months retained)'),
('pm_bonus_quality_maintenance', '1.5', 'number', 'Multiplier for high-quality maintenance completion'),

-- System Settings
('pm_system_enabled', 'true', 'boolean', 'Enable/disable the property management points system'),
('pm_max_points_per_event', '10000', 'number', 'Maximum points that can be awarded for any single event'),
('pm_auto_distribute', 'true', 'boolean', 'Automatically distribute portfolio points to team members'),

-- Distribution Settings
('pm_distribution_owner_ratio', '0.6', 'number', 'Percentage of points allocated to portfolio owner (0-1)'),
('pm_distribution_manager_ratio', '0.3', 'number', 'Percentage of points allocated to property managers (0-1)'),
('pm_distribution_team_ratio', '0.1', 'number', 'Percentage of points allocated to team members (0-1)')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();