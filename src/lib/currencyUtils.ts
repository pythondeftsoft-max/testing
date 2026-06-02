import { supabase } from '@/integrations/supabase/client';

// Currency configuration for different regions
export const CURRENCY_CONFIG = {
  'USD': { symbol: '$', locale: 'en-US', decimalPlaces: 2 },
  'EUR': { symbol: '€', locale: 'de-DE', decimalPlaces: 2 },
  'GBP': { symbol: '£', locale: 'en-GB', decimalPlaces: 2 },
  'JPY': { symbol: '¥', locale: 'ja-JP', decimalPlaces: 0 },
  'CAD': { symbol: 'C$', locale: 'en-CA', decimalPlaces: 2 },
  'AUD': { symbol: 'A$', locale: 'en-AU', decimalPlaces: 2 },
  'MXN': { symbol: 'MX$', locale: 'es-MX', decimalPlaces: 2 },
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_CONFIG;

// Get supported currencies with additional metadata
export const getSupportedCurrencies = () => {
  return Object.entries(CURRENCY_CONFIG).map(([code, config]) => ({
    code: code as SupportedCurrency,
    name: getCurrencyName(code as SupportedCurrency),
    symbol: config.symbol,
    locale: config.locale,
  }));
};

// Get currency symbol for a given currency
export const getCurrencySymbol = (currency: SupportedCurrency): string => {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
};

// Get currency display name
const getCurrencyName = (currency: SupportedCurrency): string => {
  const names: Record<SupportedCurrency, string> = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'MXN': 'Mexican Peso',
  };
  return names[currency];
};

// Enhanced currency formatting with international support
export const formatInternationalCurrency = (
  amount: number | null | undefined,
  currency: SupportedCurrency = 'USD',
  locale?: string
): string => {
  if (amount === null || amount === undefined) return CURRENCY_CONFIG[currency].symbol + '0';
  
  const config = CURRENCY_CONFIG[currency];
  const targetLocale = locale || config.locale;
  
  // Handle large numbers with K/M suffixes for better readability
  if (Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    return `${config.symbol}${millions.toFixed(1)}M`;
  }
  
  if (Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `${config.symbol}${thousands.toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(amount);
};

// Currency conversion using existing database function
export const convertCurrency = async (
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<{ convertedAmount: number; exchangeRate: number } | null> => {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, exchangeRate: 1 };
  }

  try {
    const { data, error } = await supabase.rpc('convert_currency', {
      amount: amount,
      from_currency: fromCurrency,
      to_currency: toCurrency
    });

    if (error) {
      console.warn('Currency conversion error:', error);
      return null;
    }

    // Handle the response from our RPC function
    if (Array.isArray(data) && data.length > 0) {
      return {
        convertedAmount: data[0].converted_amount,
        exchangeRate: data[0].exchange_rate
      };
    }

    return null;
  } catch (err) {
    console.error('Error converting currency:', err);
    return null;
  }
};

// Get current exchange rate using existing database function
export const getExchangeRate = async (
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number | null> => {
  if (fromCurrency === toCurrency) return 1;

  try {
    const { data, error } = await supabase.rpc('get_exchange_rate', {
      from_currency: fromCurrency,
      to_currency: toCurrency
    });

    if (error) {
      console.warn('Exchange rate fetch error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching exchange rate:', err);
    return null;
  }
};

// Detect currency based on country code
export const getCurrencyByCountry = (countryCode: string): SupportedCurrency => {
  const currencyMap: Record<string, SupportedCurrency> = {
    'US': 'USD',
    'CA': 'CAD',
    'GB': 'GBP',
    'AU': 'AUD',
    'JP': 'JPY',
    'MX': 'MXN',
    // European Union countries
    'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
    'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR',
    'LU': 'EUR', 'GR': 'EUR', 'SI': 'EUR', 'CY': 'EUR', 'MT': 'EUR',
    'SK': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR',
  };

  return currencyMap[countryCode.toUpperCase()] || 'USD';
};

// Format currency with automatic locale detection
export const formatCurrencyByCountry = (
  amount: number | null | undefined,
  countryCode: string,
  locale?: string
): string => {
  const currency = getCurrencyByCountry(countryCode);
  return formatInternationalCurrency(amount, currency, locale);
};

// Batch currency conversion for multiple amounts
export const convertMultipleCurrencies = async (
  conversions: Array<{
    amount: number;
    fromCurrency: SupportedCurrency;
    toCurrency: SupportedCurrency;
    id: string;
  }>
): Promise<Record<string, { convertedAmount: number; exchangeRate: number } | null>> => {
  const results: Record<string, { convertedAmount: number; exchangeRate: number } | null> = {};
  
  // Process conversions in parallel
  const promises = conversions.map(async (conversion) => {
    const result = await convertCurrency(
      conversion.amount,
      conversion.fromCurrency,
      conversion.toCurrency
    );
    return { id: conversion.id, result };
  });

  const completedConversions = await Promise.allSettled(promises);
  
  completedConversions.forEach((promise, index) => {
    if (promise.status === 'fulfilled') {
      results[promise.value.id] = promise.value.result;
    } else {
      results[conversions[index].id] = null;
    }
  });

  return results;
};

// Refresh exchange rates if they are older than 24 hours
export const refreshExchangeRatesIfNeeded = async (): Promise<void> => {
  try {
    // Check if rates are older than 24 hours
    const { data: latestRate, error } = await supabase
      .from('exchange_rates')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Error checking exchange rate age:', error);
      // Trigger refresh if we can't determine age
      await supabase.functions.invoke('fetch-exchange-rates');
      return;
    }

    if (!latestRate) {
      // No rates exist, fetch them
      console.log('No exchange rates found, fetching...');
      await supabase.functions.invoke('fetch-exchange-rates');
      return;
    }

    const rateAge = Date.now() - new Date(latestRate.created_at).getTime();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (rateAge > ONE_DAY) {
      console.log('Exchange rates are stale, refreshing...');
      await supabase.functions.invoke('fetch-exchange-rates');
    } else {
      console.log('Exchange rates are fresh, no refresh needed');
    }
  } catch (error) {
    console.error('Error refreshing exchange rates:', error);
  }
};
