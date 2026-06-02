import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AreaGeocodeResult {
  success: boolean;
  display_name?: string;
  type?: string;
  bbox?: [number, number, number, number]; // [west, south, east, north]
  center?: [number, number]; // [lat, lng]
  geometry?: { type: 'Polygon' | 'MultiPolygon'; coordinates: any } | null; // GeoJSON
  error?: string;
}

export const useAreaGeocoding = () => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AreaGeocodeResult | null>(null);

  const geocodeArea = useCallback(async (params: { zipcode?: string; city?: string; state?: string; country?: string; }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-area', { body: params });
      if (error) throw error;
      setLastResult(data as AreaGeocodeResult);
      return data as AreaGeocodeResult;
    } catch (e: any) {
      const fail: AreaGeocodeResult = { success: false, error: e?.message || 'Failed geocoding area' };
      setLastResult(fail);
      return fail;
    } finally {
      setLoading(false);
    }
  }, []);

  return { geocodeArea, loading, result: lastResult };
};