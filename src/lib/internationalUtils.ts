
import { formatInternationalCurrency, getCurrencyByCountry, convertCurrency, type SupportedCurrency } from './currencyUtils';
import { formatInternationalAddress, validateInternationalAddress, getCountryAddressFormat } from './enhancedDatabaseUtils';
import { parseAddressFormat } from './countryUtils';
import type { AddressFormat, InternationalAddress } from '@/types/countries';

// Unified international support interface
export interface InternationalContext {
  countryCode: string;
  currency: SupportedCurrency;
  locale?: string;
  addressFormat: AddressFormat;
}

// Create international context for a country
export const createInternationalContext = async (
  countryCode: string,
  locale?: string
): Promise<InternationalContext> => {
  const currency = getCurrencyByCountry(countryCode);
  const addressFormat = await getCountryAddressFormat(countryCode);
  
  return {
    countryCode: countryCode.toUpperCase(),
    currency,
    locale,
    addressFormat
  };
};

// Format any monetary value with appropriate currency and locale
export const formatContextualCurrency = (
  amount: number | null | undefined,
  context: InternationalContext
): string => {
  return formatInternationalCurrency(amount, context.currency, context.locale);
};

// Comprehensive address handling with validation and formatting
export const processInternationalAddress = async (
  address: InternationalAddress,
  context: InternationalContext
): Promise<{
  formatted: string;
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  components: Record<string, string>;
}> => {
  // Validate the address
  const validation = await validateInternationalAddress(address, context.countryCode);
  
  // Format the address
  const formatting = await formatInternationalAddress(address, context.countryCode);
  
  return {
    formatted: formatting.formatted,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    components: formatting.components
  };
};

// Convert and format currency between different contexts
export const convertBetweenContexts = async (
  amount: number,
  fromContext: InternationalContext,
  toContext: InternationalContext
): Promise<{
  convertedAmount: number;
  formattedAmount: string;
  exchangeRate: number;
} | null> => {
  if (fromContext.currency === toContext.currency) {
    return {
      convertedAmount: amount,
      formattedAmount: formatContextualCurrency(amount, toContext),
      exchangeRate: 1
    };
  }

  const conversion = await convertCurrency(
    amount,
    fromContext.currency,
    toContext.currency
  );

  if (!conversion) {
    return null;
  }

  return {
    convertedAmount: conversion.convertedAmount,
    formattedAmount: formatContextualCurrency(conversion.convertedAmount, toContext),
    exchangeRate: conversion.exchangeRate
  };
};

// Detect user's preferred international context
export const detectUserContext = async (
  userPreferences?: {
    country?: string;
    currency?: SupportedCurrency;
    locale?: string;
  }
): Promise<InternationalContext> => {
  // Use user preferences if available
  if (userPreferences?.country) {
    return createInternationalContext(
      userPreferences.country,
      userPreferences.locale
    );
  }

  // Try to detect from browser
  if (typeof window !== 'undefined') {
    try {
      const browserLocale = navigator.language;
      const countryCode = browserLocale.includes('-') 
        ? browserLocale.split('-')[1] 
        : 'US';
      
      return createInternationalContext(countryCode, browserLocale);
    } catch (error) {
      console.warn('Could not detect browser locale:', error);
    }
  }

  // Default to US context
  return createInternationalContext('US', 'en-US');
};

// Helper for property/asset data with international context
export interface InternationalProperty {
  id: string;
  address: InternationalAddress;
  countryCode: string;
  rent?: number;
  currency?: SupportedCurrency;
  value?: number;
}

export const processPropertyWithContext = async (
  property: InternationalProperty,
  targetContext?: InternationalContext
): Promise<{
  property: InternationalProperty;
  formattedAddress: string;
  formattedRent: string;
  formattedValue: string;
  context: InternationalContext;
  convertedAmounts?: {
    rent?: { amount: number; formatted: string };
    value?: { amount: number; formatted: string };
  };
}> => {
  // Create context for the property
  const propertyContext = await createInternationalContext(property.countryCode);
  
  // Format address
  const addressResult = await processInternationalAddress(property.address, propertyContext);
  
  // Format monetary values in property's currency
  const formattedRent = formatContextualCurrency(property.rent, propertyContext);
  const formattedValue = formatContextualCurrency(property.value, propertyContext);
  
  const result: any = {
    property,
    formattedAddress: addressResult.formatted,
    formattedRent,
    formattedValue,
    context: propertyContext
  };

  // Convert to target context if different
  if (targetContext && targetContext.currency !== propertyContext.currency) {
    const convertedAmounts: any = {};
    
    if (property.rent) {
      const rentConversion = await convertBetweenContexts(
        property.rent,
        propertyContext,
        targetContext
      );
      if (rentConversion) {
        convertedAmounts.rent = {
          amount: rentConversion.convertedAmount,
          formatted: rentConversion.formattedAmount
        };
      }
    }
    
    if (property.value) {
      const valueConversion = await convertBetweenContexts(
        property.value,
        propertyContext,
        targetContext
      );
      if (valueConversion) {
        convertedAmounts.value = {
          amount: valueConversion.convertedAmount,
          formatted: valueConversion.formattedAmount
        };
      }
    }
    
    result.convertedAmounts = convertedAmounts;
  }

  return result;
};

// Batch processing for multiple properties
export const processBatchProperties = async (
  properties: InternationalProperty[],
  targetContext?: InternationalContext
): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  
  // Process in parallel for better performance
  const promises = properties.map(async (property) => {
    const result = await processPropertyWithContext(property, targetContext);
    return { id: property.id, result };
  });

  const completedProcessing = await Promise.allSettled(promises);
  
  completedProcessing.forEach((promise, index) => {
    if (promise.status === 'fulfilled') {
      results[promise.value.id] = promise.value.result;
    } else {
      console.warn(`Failed to process property ${properties[index].id}:`, promise.reason);
      results[properties[index].id] = {
        error: 'Processing failed',
        property: properties[index]
      };
    }
  });

  return results;
};

// Country-specific business logic helpers
export const getCountrySpecificRules = (countryCode: string) => {
  const rules = {
    US: {
      requiresState: true,
      postalCodeName: 'ZIP Code',
      currencyPosition: 'before',
      dateFormat: 'MM/DD/YYYY',
      phoneFormat: '+1 (XXX) XXX-XXXX'
    },
    CA: {
      requiresState: true,
      postalCodeName: 'Postal Code',
      currencyPosition: 'before',
      dateFormat: 'DD/MM/YYYY',
      phoneFormat: '+1 (XXX) XXX-XXXX'
    },
    GB: {
      requiresState: false,
      postalCodeName: 'Postcode',
      currencyPosition: 'before',
      dateFormat: 'DD/MM/YYYY',
      phoneFormat: '+44 XXXX XXXXXX'
    },
    DE: {
      requiresState: false,
      postalCodeName: 'PLZ',
      currencyPosition: 'after',
      dateFormat: 'DD.MM.YYYY',
      phoneFormat: '+49 XXX XXXXXXX'
    }
  };

  return rules[countryCode as keyof typeof rules] || rules.US;
};
