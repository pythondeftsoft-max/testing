
import { supabase } from '@/integrations/supabase/client';
import type { AddressFormat } from '@/types/countries';
import { parseAddressFormat } from './countryUtils';

// Database utility functions for international support
export const databaseUtils = {
  // Get country address format with proper error handling
  async getCountryAddressFormat(countryCode: string): Promise<AddressFormat> {
    try {
      const { data, error } = await supabase
        .rpc('get_country_address_format', { country_code: countryCode });

      if (error) {
        console.warn('Database error fetching address format:', error);
        return parseAddressFormat(null);
      }

      return parseAddressFormat(data);
    } catch (err) {
      console.error('Error calling get_country_address_format:', err);
      return parseAddressFormat(null);
    }
  },

  // Validate postal code using existing database function
  async validatePostalCode(postalCode: string, countryCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('validate_postal_code', { 
          postal_code: postalCode, 
          country_code: countryCode 
        });

      if (error) {
        console.warn('Database error validating postal code:', error);
        return true; // Allow if validation fails
      }

      return data === true;
    } catch (err) {
      console.error('Error calling validate_postal_code:', err);
      return true; // Allow if validation fails
    }
  },

  // Get all active countries with proper typing
  async getActiveCountries() {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Database error fetching countries:', error);
        return [];
      }

      return (data || []).map(country => ({
        ...country,
        address_format: parseAddressFormat(country.address_format)
      }));
    } catch (err) {
      console.error('Error fetching countries:', err);
      return [];
    }
  }
};

// Helper function for geocoding with international support
export const geocodeInternationalAddress = async (
  address: string, 
  countryCode: string,
  entityId: string,
  entityType: 'property' | 'asset'
) => {
  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: {
        address,
        country: countryCode,
        [entityType === 'property' ? 'property_id' : 'asset_id']: entityId
      }
    });

    if (error) {
      console.warn('Geocoding error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error calling geocode function:', err);
    return null;
  }
};
