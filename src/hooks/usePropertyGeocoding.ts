import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeocodeOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export const usePropertyGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateAddress = (address: string): boolean => {
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length >= 3; // At least street, city, state
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const geocodeProperty = async (
    propertyId: string, 
    address: string,
    options: GeocodeOptions = {}
  ) => {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    
    // Validate address format
    if (!validateAddress(address)) {
      toast({
        title: "Invalid Address",
        description: "Address must include street, city, and state for geocoding.",
        variant: "destructive",
      });
      return { success: false, error: 'Invalid address format' };
    }

    try {
      setLoading(true);
      let lastError: any = null;

      // Retry logic with exponential backoff
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke('geocode-address', {
            body: {
              property_id: propertyId,
              address: address,
              country: 'US'
            }
          });

          if (error) {
            throw error;
          }

          if (data?.error) {
            throw new Error(data.error);
          }

          toast({
            title: "Success",
            description: "Property location updated successfully",
          });

          return { success: true, data };
        } catch (error) {
          lastError = error;
          console.error(`Geocoding attempt ${attempt} failed:`, error);
          
          // If not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await delay(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
          }
        }
      }

      // All retries failed
      throw lastError;
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Geocoding Failed",
        description: `Failed to update property location after ${maxRetries} attempts. The property was created but won't appear on maps.`,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const backfillCoordinates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('backfill-coordinates');

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `Geocoded ${data.geocoded} properties successfully`,
      });

      return data;
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: "Failed to geocode properties",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    geocodeProperty,
    backfillCoordinates,
    loading
  };
};
