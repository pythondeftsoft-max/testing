
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateInternationalAddress } from '@/lib/enhancedDatabaseUtils';

export interface EnhancedGeocodingOptions {
  validateFirst?: boolean;
  preferredProvider?: 'google' | 'nominatim' | 'auto';
  includePlaceDetails?: boolean;
  country?: string;
}

export interface GeocodingResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
  place_details?: {
    place_id?: string;
    types?: string[];
    accuracy?: string;
  };
  validation_warnings?: Record<string, string>;
  error?: string;
}

export const useEnhancedInternationalGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const geocodePropertyWithValidation = async (
    propertyId: string,
    address: string,
    options: EnhancedGeocodingOptions = {}
  ): Promise<GeocodingResult | null> => {
    try {
      setLoading(true);
      const country = options.country || 'US';

      // Validate address first if requested
      if (options.validateFirst) {
        const addressParts = parseAddressString(address);
        const validation = await validateInternationalAddress(addressParts, country);
        
        if (!validation.isValid) {
          toast({
            title: "Address Validation Failed",
            description: `Please check: ${Object.values(validation.errors).join(', ')}`,
            variant: "destructive",
          });
          return {
            success: false,
            error: 'Address validation failed',
          };
        }
      }

      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          property_id: propertyId,
          address: address.trim(),
          country: country,
          provider_preference: options.preferredProvider,
          include_details: options.includePlaceDetails
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result: GeocodingResult = {
        success: true,
        latitude: data.latitude,
        longitude: data.longitude,
        formatted_address: data.formatted_address,
        place_details: data.place_details,
      };

      toast({
        title: "Success",
        description: `Property location updated successfully${data.formatted_address ? ` to ${data.formatted_address}` : ''}`,
      });

      return result;
    } catch (error) {
      console.error('Enhanced geocoding error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update property location';
      
      toast({
        title: "Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const geocodeAssetWithValidation = async (
    assetId: string,
    address: string,
    options: EnhancedGeocodingOptions = {}
  ): Promise<GeocodingResult | null> => {
    try {
      setLoading(true);
      const country = options.country || 'US';

      // Validate address first if requested
      if (options.validateFirst) {
        const addressParts = parseAddressString(address);
        const validation = await validateInternationalAddress(addressParts, country);
        
        if (!validation.isValid) {
          toast({
            title: "Address Validation Failed",
            description: `Please check: ${Object.values(validation.errors).join(', ')}`,
            variant: "destructive",
          });
          return {
            success: false,
            error: 'Address validation failed',
          };
        }
      }

      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          asset_id: assetId,
          address: address.trim(),
          country: country,
          provider_preference: options.preferredProvider,
          include_details: options.includePlaceDetails
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result: GeocodingResult = {
        success: true,
        latitude: data.latitude,
        longitude: data.longitude,
        formatted_address: data.formatted_address,
        place_details: data.place_details,
      };

      toast({
        title: "Success",
        description: `Asset location updated successfully${data.formatted_address ? ` to ${data.formatted_address}` : ''}`,
      });

      return result;
    } catch (error) {
      console.error('Enhanced asset geocoding error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update asset location';
      
      toast({
        title: "Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const batchGeocodeAddresses = async (
    addresses: Array<{
      id: string;
      address: string;
      type: 'property' | 'asset';
      country?: string;
    }>,
    options: EnhancedGeocodingOptions = {}
  ): Promise<Record<string, GeocodingResult>> => {
    setLoading(true);
    const results: Record<string, GeocodingResult> = {};

    try {
      // Process in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (item) => {
          try {
            const result = item.type === 'property' 
              ? await geocodePropertyWithValidation(item.id, item.address, { 
                  ...options, 
                  country: item.country 
                })
              : await geocodeAssetWithValidation(item.id, item.address, { 
                  ...options, 
                  country: item.country 
                });
            
            return { id: item.id, result: result || { success: false, error: 'No result' } };
          } catch (error) {
            return { 
              id: item.id, 
              result: { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              } 
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((promise) => {
          if (promise.status === 'fulfilled') {
            results[promise.value.id] = promise.value.result;
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = addresses.length;

      toast({
        title: "Batch Geocoding Complete",
        description: `Successfully geocoded ${successCount} of ${totalCount} addresses`,
        variant: successCount === totalCount ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Batch geocoding error:', error);
      toast({
        title: "Batch Geocoding Failed",
        description: "Failed to process batch geocoding request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

    return results;
  };

  return {
    geocodeProperty: geocodePropertyWithValidation,
    geocodeAsset: geocodeAssetWithValidation,
    batchGeocode: batchGeocodeAddresses,
    loading
  };
};

// Helper function to parse address string into components
const parseAddressString = (address: string): {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
} => {
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    
    if (stateZipMatch) {
      return {
        street: parts.slice(0, -2).join(', '),
        city: parts[parts.length - 2],
        state: stateZipMatch[1],
        postalCode: stateZipMatch[2],
      };
    }
  }
  
  // Fallback to simple parsing
  return {
    street: parts[0],
    city: parts[1],
    state: parts[2],
    postalCode: parts[3],
  };
};
