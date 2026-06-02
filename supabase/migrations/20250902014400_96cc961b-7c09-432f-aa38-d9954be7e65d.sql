
-- Create system_config table to store configurable system settings
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  config_type TEXT NOT NULL DEFAULT 'number',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for system_config
CREATE POLICY "Admins can manage system config" 
  ON public.system_config 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view system config" 
  ON public.system_config 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_updated_at();

-- Seed initial system configuration values
INSERT INTO public.system_config (config_key, config_value, description, config_type) VALUES
-- Points System Configuration
('points_system_enabled', 'true', 'Enable or disable the entire points system', 'boolean'),
('points_per_rent_payment', '1000', 'Points awarded for each rent payment', 'number'),
('points_per_referral', '10000', 'Base points awarded for successful referrals', 'number'),
('points_per_lease_renewal', '5000', 'Points awarded for lease renewals', 'number'),
('points_to_dollar_ratio', '100', 'Points needed to equal $1 (100 points = $1)', 'number'),
('section_8_bonus_multiplier', '1.5', 'Multiplier for Section 8 tenants', 'number'),
('referral_5x_bonus', '25000', 'Bonus points for 5 successful referrals', 'number'),
('early_payment_bonus', '500', 'Bonus points for early rent payments', 'number'),
('maintenance_cooperation_bonus', '250', 'Bonus points for maintenance cooperation', 'number'),
('max_points_per_month', '50000', 'Maximum points a user can earn per month', 'number'),

-- Referral System Configuration
('referral_system_enabled', 'true', 'Enable or disable referral system', 'boolean'),
('referral_base_reward', '100.00', 'Base reward amount for successful referrals', 'currency'),
('referral_milestone_threshold', '5', 'Number of referrals for milestone bonus', 'number'),
('referral_milestone_bonus', '250.00', 'Bonus amount for reaching referral milestone', 'currency'),
('referral_expiry_days', '90', 'Days before referral expires', 'number'),

-- Reward System Configuration
('rewards_system_enabled', 'true', 'Enable or disable rewards system', 'boolean'),
('min_redemption_points', '1000', 'Minimum points required for redemption', 'number'),
('gift_card_denominations', '["25", "50", "100", "250"]', 'Available gift card amounts', 'json'),
('reward_processing_fee', '0.03', 'Processing fee percentage for rewards', 'number'),

-- System Limits
('max_applications_per_month', '10', 'Maximum property applications per tenant per month', 'number'),
('property_import_batch_size', '100', 'Maximum properties per import batch', 'number'),
('file_upload_max_size_mb', '10', 'Maximum file upload size in MB', 'number'),

-- Notification Settings
('email_notifications_enabled', 'true', 'Enable email notifications', 'boolean'),
('push_notifications_enabled', 'true', 'Enable push notifications', 'boolean'),
('notification_digest_enabled', 'true', 'Enable daily notification digests', 'boolean'),

-- Maintenance System
('maintenance_auto_assignment', 'false', 'Auto-assign maintenance requests to vendors', 'boolean'),
('maintenance_sla_hours', '48', 'SLA hours for maintenance response', 'number'),
('emergency_maintenance_sla_hours', '4', 'SLA hours for emergency maintenance', 'number')

ON CONFLICT (config_key) DO NOTHING;
