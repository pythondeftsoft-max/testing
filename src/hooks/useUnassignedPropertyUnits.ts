import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PropertyUnitListing {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name: string | null;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  monthly_rent: number;
  property_monthly_rent: number | null;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  status: string;
  on_market: boolean;
  assigned_worker_id: string | null;
  territory_id: string | null;
  pipeline_stage: string | null;
  created_at: string;
  updated_at: string;
  photos: string[] | null;
  application_count?: number;
}

export const useUnassignedPropertyUnits = () => {
  return useQuery({
    queryKey: ['unassigned-property-units'],
    queryFn: async () => {
      // Build the base query - show units where EITHER unit OR property is on_market
      // This matches marketplace visibility logic
      let query = supabase
        .from('property_units')
        .select(`
          id,
          property_id,
          unit_number,
          unit_name,
          monthly_rent,
          bedrooms,
          bathrooms,
          square_feet,
          status,
          on_market,
          assigned_worker_id,
          territory_id,
          pipeline_stage,
          created_at,
          updated_at,
          photos,
          properties!inner (
            address,
            city,
            state,
            zipcode,
            deleted_at,
            on_market,
            monthly_rent
          )
        `)
        .is('properties.deleted_at', null)
        .order('created_at', { ascending: false });
      
      // Client-side filter: show units where unit.on_market OR property.on_market is true
      const { data: rawData, error } = await query;
      
      if (error) throw error;
      
      // Filter to only units/properties that are actually on market AND unassigned
      const dataToProcess = (rawData || []).filter((unit: any) => 
        (unit.on_market === true || unit.properties.on_market === true) &&
        unit.assigned_worker_id === null
      );

      // Transform data to flatten properties relationship
      // IMPORTANT: Use pipeline_stage as the source of truth for status display
      const units: PropertyUnitListing[] = dataToProcess.map((unit: any) => ({
        id: unit.id,
        property_id: unit.property_id,
        unit_number: unit.unit_number,
        unit_name: unit.unit_name,
        address: unit.properties.address,
        city: unit.properties.city,
        state: unit.properties.state,
        zipcode: unit.properties.zipcode,
        monthly_rent: unit.monthly_rent,
        property_monthly_rent: unit.properties.monthly_rent,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        square_feet: unit.square_feet,
        status: unit.pipeline_stage || unit.status || 'available', // Use pipeline_stage as source of truth
        on_market: unit.on_market,
        assigned_worker_id: unit.assigned_worker_id,
        territory_id: unit.territory_id,
        pipeline_stage: unit.pipeline_stage,
        created_at: unit.created_at,
        updated_at: unit.updated_at,
        photos: unit.photos,
      }));

      // Fetch application counts for all units from marketplace_applications
      if (units.length > 0) {
        const propertyIds = [...new Set(units.map(u => u.property_id))];
        const { data: appCounts, error: appError } = await supabase
          .from('marketplace_applications')
          .select('property_id')
          .in('property_id', propertyIds);

        if (!appError && appCounts) {
          // Count applications per property
          const countMap = appCounts.reduce((acc: Record<string, number>, app: any) => {
            acc[app.property_id] = (acc[app.property_id] || 0) + 1;
            return acc;
          }, {});

          // Add counts to units based on their property_id
          units.forEach(unit => {
            unit.application_count = countMap[unit.property_id] || 0;
          });
        }
      }

      return units;
    },
    staleTime: 5000, // 5 seconds for faster queue updates
  });
};
