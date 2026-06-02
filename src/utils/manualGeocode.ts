// One-time utility to geocode missing property
import { supabase } from '@/integrations/supabase/client';

export async function geocodeMissingProperty() {
  const propertyId = '28bfc9bf-94d3-477e-8560-4336c34ed0f6';
  const address = '424 east olive street, Long Beach, NY 11561';
  
  console.log('Geocoding property:', propertyId, address);
  
  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: {
        property_id: propertyId,
        address: address,
        country: 'US'
      }
    });
    
    if (error) {
      console.error('Geocoding error:', error);
      return { success: false, error };
    }
    
    console.log('Geocoding successful:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Geocoding exception:', err);
    return { success: false, error: err };
  }
}

// Auto-execute on import (for dev console testing)
if (typeof window !== 'undefined') {
  (window as any).geocodeMissingProperty = geocodeMissingProperty;
  console.log('Run geocodeMissingProperty() in console to geocode the missing admin property');
}
