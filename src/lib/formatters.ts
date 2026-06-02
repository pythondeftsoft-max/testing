
import { formatInternationalCurrency, type SupportedCurrency } from './currencyUtils';

// Enhanced formatCurrency with international support (backward compatible)
export const formatCurrency = (
  amount: number | null | undefined,
  currency?: SupportedCurrency,
  locale?: string
): string => {
  // Maintain backward compatibility - default to USD
  if (!currency) {
    if (amount === null || amount === undefined) return '$0';
    
    // Original USD formatting logic preserved
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Use international formatting for non-USD currencies
  return formatInternationalCurrency(amount, currency, locale);
};

// Convert stored yearly income values back to original range text
export const formatIncomeRange = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'Not specified';
  
  // If it's already a descriptive string, format it nicely
  if (typeof amount === 'string') {
    const str = amount.trim().toLowerCase();
    if (!str || str === '0') return 'Not specified';
    if (str.includes('under') && str.includes('15000')) return 'Under $15,000';
    if (str.includes('15000') && str.includes('25000')) return '$15,000 - $25,000';
    if (str.includes('25000') && str.includes('35000')) return '$25,000 - $35,000';
    if (str.includes('35000') && str.includes('50000')) return '$35,000 - $50,000';
    if (str.includes('50000') && str.includes('75000')) return '$50,000 - $75,000';
    if (str.includes('75000') && str.includes('plus')) return '$75,000+';
    // Try parsing as number
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) {
      amount = parsed;
    } else {
      return amount.toString();
    }
  }
  
  if (amount <= 15000) return 'Under $15,000';
  if (amount <= 25000) return '$15,000 - $25,000';
  if (amount <= 35000) return '$25,000 - $35,000';
  if (amount <= 50000) return '$35,000 - $50,000';
  if (amount <= 75000) return '$50,000 - $75,000';
  return '$75,000+';
};

export const formatPercentage = (percentage: number) => {
  return `${Math.round(percentage)}%`;
};

export const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// New international-aware formatters
export const formatCurrencyByCountry = (
  amount: number | null | undefined,
  countryCode: string,
  locale?: string
): string => {
  // Import getCurrencyByCountry here to avoid circular imports
  const { getCurrencyByCountry } = require('./currencyUtils');
  const currency = getCurrencyByCountry(countryCode);
  return formatCurrency(amount, currency, locale);
};

export const formatNumberByLocale = (
  num: number,
  locale: string = 'en-US'
): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })}K`;
  }
  return num.toLocaleString(locale);
};
