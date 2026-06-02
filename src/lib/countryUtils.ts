
import type { AddressFormat } from '@/types/countries';

// Type guard to check if a value is a valid AddressFormat
export const isValidAddressFormat = (value: unknown): value is AddressFormat => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    Array.isArray(obj.format) &&
    Array.isArray(obj.required) &&
    obj.format.every((item: unknown) => typeof item === 'string') &&
    obj.required.every((item: unknown) => typeof item === 'string')
  );
};

// Safely parse address format from database JSON
export const parseAddressFormat = (jsonData: unknown): AddressFormat => {
  // Default fallback format for US/standard addresses
  const defaultFormat: AddressFormat = {
    format: ['street', 'city', 'state', 'postal_code'],
    required: ['street', 'city']
  };

  if (!jsonData) {
    return defaultFormat;
  }

  // Handle string JSON that needs parsing
  if (typeof jsonData === 'string') {
    try {
      const parsed = JSON.parse(jsonData);
      return isValidAddressFormat(parsed) ? parsed : defaultFormat;
    } catch {
      return defaultFormat;
    }
  }

  // Handle already parsed object
  if (isValidAddressFormat(jsonData)) {
    return jsonData;
  }

  return defaultFormat;
};

// Get safe country name with fallback
export const getSafeCountryName = (country: unknown): string => {
  if (country && typeof country === 'object' && 'name' in country) {
    return typeof country.name === 'string' ? country.name : 'Unknown Country';
  }
  return 'Unknown Country';
};

// Validate postal code format (integrates with existing database function)
export const validatePostalCodeFormat = (postalCode: string, countryCode: string): boolean => {
  if (!postalCode || !countryCode) {
    return true; // Allow empty postal codes
  }
  
  // This will eventually integrate with the existing validate_postal_code database function
  // For now, basic validation
  return postalCode.trim().length > 0;
};
