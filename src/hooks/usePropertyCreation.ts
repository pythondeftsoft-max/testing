import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkSingleFamilyDuplicates } from '@/utils/duplicateDetection';

// Async helper for background geocoding (doesn't block property creation)
const geocodePropertyAsync = async (propertyId: string, address: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: {
        property_id: propertyId,
        address: address
      }
    });
    
    if (error) {
      console.log('Background geocoding failed (non-critical):', error);
    } else if (data && !data.success) {
      console.log('Geocoding could not find coordinates (non-critical):', data.message);
    } else {
      console.log('Property geocoded successfully');
    }
  } catch (error) {
    // Silently fail - geocoding is not critical
    console.log('Background geocoding error (non-critical):', error);
  }
};

// Auto-create Unit 1 for residential properties
const createDefaultUnitAsync = async (propertyData: any) => {
  try {
    // Only create unit for residential properties (not commercial)
    if (propertyData.property_type === 'commercial') {
      return;
    }

    // Create Unit 1 with property's basic details
    const unitData = {
      property_id: propertyData.id,
      unit_number: '1',
      unit_name: 'Unit 1',
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      square_feet: propertyData.square_feet || null,
      status: 'vacant',
      unit_amenities: propertyData.amenities || []
    };

    const { error } = await supabase
      .from('property_units')
      .insert(unitData);

    if (error) {
      console.error('Failed to create default unit:', error);
    } else {
      console.log(`Unit 1 created for property ${propertyData.id}`);
    }
  } catch (error) {
    console.error('Default unit creation failed:', error);
    // Silent failure - property creation already succeeded
  }
};

export function usePropertyCreation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const checkDuplicates = async (data: {
    owner_id: string;
    address: string;
    property_type: string;
  }) => {
    // Only check for single family (house) duplicates
    const isSingleFamily = data.property_type === 'house';
    
    if (isSingleFamily) {
      return await checkSingleFamilyDuplicates(data.owner_id, data.address);
    }
    
    return { hasDuplicates: false, duplicateType: null };
  };

  const createProperty = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('properties')
        .insert(data)
        .select()
        .single();

      if (error) {
        // Handle constraint violations with friendly messages
        if (error.code === '23505') {
          if (error.message.includes('idx_properties_no_duplicate_single_family')) {
            throw new Error('A single-family house with this address already exists in your portfolio. Duplicate properties are not allowed.');
          } else {
            throw new Error('This property would create a duplicate entry that is not allowed.');
          }
        }
        throw error;
      }

      // Trigger automatic geocoding in background (fire-and-forget)
      if (result?.id && result?.address) {
        geocodePropertyAsync(result.id, result.address);
      }

      // Auto-create units for residential properties (SYNCHRONOUS - must succeed)
      if (result?.id && result.property_type !== 'commercial') {
        const units = data.units || [];
        
        if (units.length > 0) {
          // Create all units from the form
          const unitsToInsert = units.map((unit: any, index: number) => ({
            property_id: result.id,
            unit_number: unit.name || `${index + 1}`,
            unit_name: unit.name || `Unit ${index + 1}`,
            bedrooms: unit.bedrooms ? parseInt(unit.bedrooms) : 0,
            bathrooms: unit.bathrooms ? parseFloat(unit.bathrooms) : 0,
            square_feet: unit.squareFeet ? parseInt(unit.squareFeet) : null,
            monthly_rent: unit.monthlyRent ? parseFloat(unit.monthlyRent) : null,
            status: 'vacant',
            unit_amenities: result.amenities || [],
            photos: result.photos || []
          }));
          
          const { error: unitError } = await supabase
            .from('property_units')
            .insert(unitsToInsert);
            
          if (unitError) {
            console.error('Failed to create units:', unitError);
          }
        } else {
          // Fallback: create default Unit 1 (backward compatibility)
          const unitData = {
            property_id: result.id,
            unit_number: '1',
            unit_name: 'Unit 1',
            bedrooms: result.bedrooms || 0,
            bathrooms: result.bathrooms || 0,
            square_feet: result.square_feet || null,
            status: 'vacant',
            unit_amenities: result.amenities || [],
            photos: result.photos || []
          };
          
          const { error: unitError } = await supabase
            .from('property_units')
            .insert(unitData);
            
          if (unitError) {
            console.error('Failed to create Unit 1:', unitError);
          }
        }
      }

      return result;
    },
    onMutate: async (newPropertyData) => {
      const userId = newPropertyData.owner_id;
      const portfolioId = newPropertyData.portfolio_id;
      
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['properties'] });
      
      // Snapshot previous value for rollback
      const previousProperties = queryClient.getQueryData(['properties', 'with-units', userId, portfolioId]);
      
      // Optimistically update UI with temporary property
      queryClient.setQueryData(['properties', 'with-units', userId, portfolioId], (old: any) => {
        const tempProperty = { 
          ...newPropertyData, 
          id: 'temp-' + Date.now(),
          property_units: newPropertyData.units?.map((unit: any, index: number) => ({
            id: 'temp-unit-' + index,
            unit_number: unit.name || `${index + 1}`,
            monthly_rent: unit.monthlyRent ? parseFloat(unit.monthlyRent) : null,
            status: 'vacant'
          })) || []
        };
        return [...(old || []), tempProperty];
      });
      
      return { previousProperties, userId, portfolioId };
    },
    onSuccess: (newProperty, variables, context) => {
      const userId = context?.userId || variables.owner_id;
      const portfolioId = context?.portfolioId || variables.portfolio_id;
      
      // Targeted invalidations - only invalidate specific queries
      queryClient.invalidateQueries({ 
        queryKey: ['properties', 'with-units', userId, portfolioId],
        exact: true 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['user-properties', userId, portfolioId],
        exact: true
      });
      
      // Only invalidate metrics for the specific portfolio
      if (newProperty.portfolio_id) {
        queryClient.invalidateQueries({
          queryKey: ['portfolio-metrics'],
        });
      }
      
      toast({
        title: "Property Created",
        description: "Property has been added successfully.",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousProperties && context?.userId) {
        queryClient.setQueryData(
          ['properties', 'with-units', context.userId, context.portfolioId],
          context.previousProperties
        );
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to create property.",
        variant: "destructive",
      });
    },
  });

  return {
    checkDuplicates,
    createProperty: createProperty.mutateAsync,
    isCreating: createProperty.isPending
  };
}