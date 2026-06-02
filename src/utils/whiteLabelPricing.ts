// White Label Pricing Tier Definitions and Utilities

export interface PricingTier {
  tier_name: 'free' | 'basic' | 'premium' | 'enterprise';
  monthly_cost: number;
  annual_cost: number;
  features: string[];
  max_domains: number;
  max_page_views: number | null;
  display_order: number;
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  free: {
    tier_name: 'free',
    monthly_cost: 0,
    annual_cost: 0,
    features: ['1 Custom Subdomain', 'Basic Branding', 'Community Support'],
    max_domains: 1,
    max_page_views: 10000,
    display_order: 1,
  },
  basic: {
    tier_name: 'basic',
    monthly_cost: 49,
    annual_cost: 490,
    features: ['1 Custom Domain', 'Full Branding', '10K Page Views/mo', 'Email Support'],
    max_domains: 1,
    max_page_views: 10000,
    display_order: 2,
  },
  premium: {
    tier_name: 'premium',
    monthly_cost: 149,
    annual_cost: 1490,
    features: ['5 Custom Domains', 'Advanced Features', '100K Page Views/mo', 'Priority Support', 'Custom Analytics'],
    max_domains: 5,
    max_page_views: 100000,
    display_order: 3,
  },
  enterprise: {
    tier_name: 'enterprise',
    monthly_cost: 499,
    annual_cost: 4990,
    features: ['Unlimited Domains', 'White Glove Support', 'Unlimited Page Views', 'Custom Features', 'Dedicated Account Manager'],
    max_domains: 999,
    max_page_views: null,
    display_order: 4,
  },
};

export const formatMonthlyCost = (cost: number, billingCycle: string = 'monthly'): string => {
  if (cost === 0) return 'Free';
  return `$${cost}/mo`;
};

export const formatAnnualCost = (cost: number): string => {
  if (cost === 0) return 'Free';
  return `$${cost}/yr`;
};

export const getTierDisplayName = (tier: string): string => {
  const tierMap: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };
  return tierMap[tier] || tier;
};

export const getTierColor = (tier: string): string => {
  const colorMap: Record<string, string> = {
    free: 'text-muted-foreground',
    basic: 'text-blue-600',
    premium: 'text-purple-600',
    enterprise: 'text-amber-600',
  };
  return colorMap[tier] || 'text-muted-foreground';
};

export const calculateMonthlyCost = (
  tier: string,
  customCost?: number,
  billingCycle: string = 'monthly'
): number => {
  if (customCost !== undefined && customCost !== null) {
    return customCost;
  }
  
  const pricingTier = PRICING_TIERS[tier];
  if (!pricingTier) return 0;
  
  return billingCycle === 'annual' 
    ? Math.round(pricingTier.annual_cost / 12) 
    : pricingTier.monthly_cost;
};
