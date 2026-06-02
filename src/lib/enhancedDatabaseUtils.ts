
import { supabase } from '@/integrations/supabase/client';
import type { AddressFormat } from '@/types/countries';
import { parseAddressFormat } from './countryUtils';

// Enhanced postal code validation with comprehensive country support
export const validateInternationalPostalCode = async (
  postalCode: string,
  countryCode: string
): Promise<{ isValid: boolean; formatted?: string; error?: string }> => {
  if (!postalCode || !countryCode) {
    return { isValid: true }; // Allow empty postal codes
  }

  try {
    const { data, error } = await supabase.rpc('validate_postal_code', {
      postal_code: postalCode.trim(),
      country_code: countryCode.toUpperCase()
    });

    if (error) {
      console.warn('Postal code validation error:', error);
      return { isValid: true, error: 'Validation service unavailable' };
    }

    // Format postal code based on country conventions
    const formatted = formatPostalCodeByCountry(postalCode, countryCode);
    
    return {
      isValid: data === true,
      formatted: formatted !== postalCode ? formatted : undefined
    };
  } catch (err) {
    console.error('Error validating postal code:', err);
    return { isValid: true, error: 'Cannot validate postal code' };
  }
};

// Format postal codes according to country-specific conventions
export const formatPostalCodeByCountry = (postalCode: string, countryCode: string): string => {
  const cleaned = postalCode.replace(/\s+/g, '').toUpperCase();
  
  switch (countryCode.toUpperCase()) {
    case 'CA': // Canadian postal codes: A1A 1A1
      if (cleaned.length === 6) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      }
      break;
    case 'GB': // UK postal codes: SW1A 1AA
      if (cleaned.length >= 5) {
        const outward = cleaned.slice(0, -3);
        const inward = cleaned.slice(-3);
        return `${outward} ${inward}`;
      }
      break;
    case 'US': // US ZIP codes: 12345 or 12345-6789
      if (cleaned.length === 9) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
      }
      break;
    case 'NL': // Netherlands: 1234 AB
      if (cleaned.length === 6) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
      }
      break;
    default:
      return postalCode.trim();
  }
  
  return postalCode.trim();
};

// Enhanced address formatting with international support
export const formatInternationalAddress = async (
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
  countryCode: string
): Promise<{
  formatted: string;
  components: Record<string, string>;
  addressFormat: AddressFormat;
}> => {
  // Get country-specific address format
  const addressFormat = await getCountryAddressFormat(countryCode);
  
  // Clean and validate postal code
  const postalValidation = await validateInternationalPostalCode(
    address.postalCode || '',
    countryCode
  );
  
  const components: Record<string, string> = {
    street: address.street?.trim() || '',
    city: address.city?.trim() || '',
    state: address.state?.trim() || '',
    postalCode: postalValidation.formatted || address.postalCode?.trim() || '',
    country: address.country?.trim() || '',
  };

  // Format address according to country conventions
  const formatted = formatAddressByFormat(components, addressFormat, countryCode);
  
  return {
    formatted,
    components,
    addressFormat
  };
};

// Get country address format with caching
const addressFormatCache = new Map<string, AddressFormat>();

export const getCountryAddressFormat = async (countryCode: string): Promise<AddressFormat> => {
  // Check cache first
  if (addressFormatCache.has(countryCode)) {
    return addressFormatCache.get(countryCode)!;
  }

  try {
    const { data, error } = await supabase.rpc('get_country_address_format', {
      country_code: countryCode.toUpperCase()
    });

    if (error) {
      console.warn('Error fetching address format:', error);
      const fallback = parseAddressFormat(null);
      addressFormatCache.set(countryCode, fallback);
      return fallback;
    }

    const format = parseAddressFormat(data);
    addressFormatCache.set(countryCode, format);
    return format;
  } catch (err) {
    console.error('Error getting country address format:', err);
    const fallback = parseAddressFormat(null);
    addressFormatCache.set(countryCode, fallback);
    return fallback;
  }
};

// Format address components according to country-specific format
const formatAddressByFormat = (
  components: Record<string, string>,
  addressFormat: AddressFormat,
  countryCode: string
): string => {
  const parts: string[] = [];
  
  // Use the country's address format order
  addressFormat.format.forEach(field => {
    const value = components[field];
    if (value) {
      parts.push(value);
    }
  });

  // Apply country-specific formatting rules
  switch (countryCode.toUpperCase()) {
    case 'US':
    case 'CA':
      // City, State ZIP
      if (components.city && components.state && components.postalCode) {
        const lastIndex = parts.length - 1;
        if (lastIndex >= 2) {
          parts[lastIndex - 2] = components.city;
          parts[lastIndex - 1] = `${components.state} ${components.postalCode}`;
          parts.splice(lastIndex, 1); // Remove duplicate postal code
        }
      }
      break;
    case 'GB':
      // City, County, Postal Code
      return parts.join(', ');
    case 'DE':
    case 'AT':
    case 'CH':
      // Street, ZIP City
      if (components.postalCode && components.city) {
        const cityIndex = parts.findIndex(p => p === components.city);
        if (cityIndex >= 0) {
          parts[cityIndex] = `${components.postalCode} ${components.city}`;
        }
      }
      break;
    default:
      return parts.filter(Boolean).join(', ');
  }
  
  return parts.filter(Boolean).join(', ');
};

// Validate complete address structure
export const validateInternationalAddress = async (
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
  countryCode: string
): Promise<{
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}> => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // Get address format for validation
  const addressFormat = await getCountryAddressFormat(countryCode);
  
  // Check required fields
  addressFormat.required.forEach(field => {
    const value = address[field as keyof typeof address];
    if (!value || !value.trim()) {
      errors[field] = `${field} is required for ${countryCode}`;
    }
  });

  // Validate postal code if provided
  if (address.postalCode) {
    const postalValidation = await validateInternationalPostalCode(
      address.postalCode,
      countryCode
    );
    
    if (!postalValidation.isValid) {
      errors.postalCode = `Invalid postal code format for ${countryCode}`;
    } else if (postalValidation.formatted && postalValidation.formatted !== address.postalCode) {
      warnings.postalCode = `Postal code can be formatted as: ${postalValidation.formatted}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

// Batch address validation for multiple addresses
export const validateMultipleAddresses = async (
  addresses: Array<{
    id: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    countryCode: string;
  }>
): Promise<Record<string, {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}>> => {
  const results: Record<string, any> = {};
  
  // Process validations in parallel
  const promises = addresses.map(async (item) => {
    const result = await validateInternationalAddress(item.address, item.countryCode);
    return { id: item.id, result };
  });

  const completedValidations = await Promise.allSettled(promises);
  
  completedValidations.forEach((promise, index) => {
    if (promise.status === 'fulfilled') {
      results[promise.value.id] = promise.value.result;
    } else {
      results[addresses[index].id] = {
        isValid: false,
        errors: { general: 'Validation failed' },
        warnings: {}
      };
    }
  });

  return results;
};
