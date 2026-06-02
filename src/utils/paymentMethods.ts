/**
 * Payment method utilities for consistent display and mapping
 */

export type PayoutMethod = 'check' | 'digital_check' | 'ach';

/**
 * Display labels for payment methods
 */
export const PAYMENT_METHOD_LABELS: Record<PayoutMethod, string> = {
  digital_check: 'ePay',
  ach: 'ACH',
  check: 'Mailed Check (Legacy)'
};

/**
 * Available payment method options for new payments
 */
export const AVAILABLE_PAYMENT_METHODS: { value: PayoutMethod; label: string; description: string }[] = [
  {
    value: 'digital_check',
    label: 'ePay',
    description: 'Electronic check delivery via email'
  },
  {
    value: 'ach',
    label: 'ACH',
    description: 'Direct bank transfer'
  }
];

/**
 * Get display label for a payment method
 */
export const getPaymentMethodLabel = (method: PayoutMethod): string => {
  return PAYMENT_METHOD_LABELS[method] || method;
};

/**
 * Get description for a payment method
 */
export const getPaymentMethodDescription = (method: PayoutMethod): string => {
  const descriptions: Record<PayoutMethod, string> = {
    digital_check: 'Electronic check delivered via email for quick processing',
    ach: 'Direct bank transfer - typically takes 1-2 business days',
    check: 'Physical check mailed to recipient (legacy option)'
  };
  
  return descriptions[method] || '';
};