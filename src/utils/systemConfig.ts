import { supabase } from '@/integrations/supabase/client';

// Cache for config values to avoid repeated database calls
const configCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getSystemConfig = async (key: string, fallback: any = null) => {
  try {
    // Check cache first
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.value;
    }

    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', key)
      .single();

    if (error) {
      console.warn(`Config key '${key}' not found, using fallback:`, fallback);
      return fallback;
    }

    // Parse the JSONB value based on type
    let value = data.config_value;
    if (typeof value === 'string') {
      // Handle string values that might be JSON
      try {
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(Number(value))) value = Number(value);
        else if (value.startsWith('[') || value.startsWith('{')) value = JSON.parse(value);
      } catch {
        // Keep as string if parsing fails
      }
    }

    configCache.set(key, { value, timestamp: Date.now() });
    return value;
  } catch (error) {
    console.error('Error fetching system config:', error);
    return fallback;
  }
};

export const getPointsConfig = {
  rentPayment: () => getSystemConfig('points_per_rent_payment', 1000),
  referral: () => getSystemConfig('points_per_referral', 10000),
  leaseRenewal: () => getSystemConfig('points_per_lease_renewal', 5000),
  dollarRatio: () => getSystemConfig('points_to_dollar_ratio', 100),
  section8Multiplier: () => getSystemConfig('section_8_bonus_multiplier', 1.5),
  referral5xBonus: () => getSystemConfig('referral_5x_bonus', 25000),
  earlyPaymentBonus: () => getSystemConfig('early_payment_bonus', 500),
  maintenanceBonus: () => getSystemConfig('maintenance_cooperation_bonus', 250),
  systemEnabled: () => getSystemConfig('points_system_enabled', true),
  maxPointsPerMonth: () => getSystemConfig('max_points_per_month', 50000),
};

export const getReferralConfig = {
  systemEnabled: () => getSystemConfig('referral_system_enabled', true),
  baseReward: () => getSystemConfig('referral_base_reward', 100.00),
  milestoneThreshold: () => getSystemConfig('referral_milestone_threshold', 5),
  milestoneBonus: () => getSystemConfig('referral_milestone_bonus', 250.00),
  expiryDays: () => getSystemConfig('referral_expiry_days', 90),
};

export const getRewardConfig = {
  systemEnabled: () => getSystemConfig('rewards_system_enabled', true),
  minRedemptionPoints: () => getSystemConfig('min_redemption_points', 1000),
  giftCardDenominations: () => getSystemConfig('gift_card_denominations', ['25', '50', '100', '250']),
  processingFee: () => getSystemConfig('reward_processing_fee', 0.03),
};

export const getRedemptionConfig = {
  landlordRate: () => getSystemConfig('redemption_rate_landlord', 100),
  tenantRate: () => getSystemConfig('redemption_rate_tenant', 200),
  landlordMinPoints: () => getSystemConfig('redemption_min_points_landlord', 500),
  tenantMinPoints: () => getSystemConfig('redemption_min_points_tenant', 1000),
};

export const getSystemLimits = {
  maxApplicationsPerMonth: () => getSystemConfig('max_applications_per_month', 10),
  propertyImportBatchSize: () => getSystemConfig('property_import_batch_size', 100),
  fileUploadMaxSizeMb: () => getSystemConfig('file_upload_max_size_mb', 10),
};

export const getNotificationConfig = {
  emailEnabled: () => getSystemConfig('email_notifications_enabled', true),
  pushEnabled: () => getSystemConfig('push_notifications_enabled', true),
  digestEnabled: () => getSystemConfig('notification_digest_enabled', true),
};

export const getMaintenanceConfig = {
  autoAssignment: () => getSystemConfig('maintenance_auto_assignment', false),
  slaHours: () => getSystemConfig('maintenance_sla_hours', 48),
  emergencySlaHours: () => getSystemConfig('emergency_maintenance_sla_hours', 4),
};

export const getSmsConfig = {
  systemEnabled: () => getSystemConfig('sms_system_enabled', false),
};

// Helper function to clear cache (useful for testing or when configs are updated)
export const clearConfigCache = () => {
  configCache.clear();
};

// Helper function to preload all config values
export const preloadConfigs = async () => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value');

    if (error) throw error;

    data?.forEach(config => {
      let value = config.config_value;
      if (typeof value === 'string') {
        try {
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value))) value = Number(value);
          else if (value.startsWith('[') || value.startsWith('{')) value = JSON.parse(value);
        } catch {
          // Keep as string if parsing fails
        }
      }
      
      configCache.set(config.config_key, {
        value,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Error preloading configs:', error);
  }
};
