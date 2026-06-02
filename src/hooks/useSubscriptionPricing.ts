export const PLAN_PRICING = {
  'free_landlord': { base: 0, perUnit: 0, isPerUnit: false },
  'free_tenant': { base: 0, perUnit: 0, isPerUnit: false },
  'tenant_pro': { base: 9.99, perUnit: 0, isPerUnit: false },
  'basic': { base: 0, perUnit: 1.16, isPerUnit: true },
  'pro': { base: 0, perUnit: 2.00, isPerUnit: true },
  'analytics_tracking': { base: 9.99, perUnit: 0, isPerUnit: false },
  'premium': { base: 9.99, perUnit: 0, isPerUnit: false }, // Legacy support
  'white_label': { base: 99, perUnit: 0, isPerUnit: false },
} as const;

export const useSubscriptionPricing = (planType: string, subscriptionUnits: number = 1) => {
  const basePlanType = planType?.toLowerCase() || 'free_landlord';
  const pricingInfo = PLAN_PRICING[basePlanType as keyof typeof PLAN_PRICING];
  
  if (!pricingInfo) {
    return {
      basePrice: 0,
      perUnitPrice: 0,
      totalPrice: 0,
      formattedPrice: 'Free',
      isPerUnit: false,
    };
  }
  
  const totalPrice = pricingInfo.isPerUnit 
    ? pricingInfo.perUnit * subscriptionUnits 
    : pricingInfo.base;
  
  return {
    basePrice: pricingInfo.base,
    perUnitPrice: pricingInfo.perUnit,
    totalPrice,
    formattedPrice: totalPrice === 0 ? 'Free' : `$${totalPrice.toFixed(2)}/mo`,
    isPerUnit: pricingInfo.isPerUnit,
  };
};
