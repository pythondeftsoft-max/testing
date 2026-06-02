
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useInternationalGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const geocodeProperty = async (propertyId: string, address: string, country = 'US') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          property_id: propertyId,
          address: address,
          country: country
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

      return data;
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Error",
        description: "Failed to update property location",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const geocodeAsset = async (assetId: string, address: string, country = 'US') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          asset_id: assetId,
          address: address,
          country: country
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
        description: "Asset location updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Asset geocoding error:', error);
      toast({
        title: "Error",
        description: "Failed to update asset location",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    geocodeProperty,
    geocodeAsset,
    loading
  };
};
