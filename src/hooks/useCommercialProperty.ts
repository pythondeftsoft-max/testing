import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommercialPropertyData } from '@/types/commercial';
import { propertyKeys } from './useProperties';

interface SubmitCommercialPropertyData extends CommercialPropertyData {
  owner_id: string;
  portfolio_id?: string;
}

export function useSubmitCommercialProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SubmitCommercialPropertyData) => {
      // Map the commercial property data to database format
      const propertyData = {
        // Required fields
        owner_id: data.owner_id,
        portfolio_id: data.portfolio_id || null,
        property_type: 'commercial',
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        country: data.country || 'US',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        
        // Commercial specific fields
        commercial_type: data.commercial_type,
        commercial_subtype: data.commercial_subtype || null,
        asset_tags: data.asset_tags || [],
        source_badge: data.source_badge || 'manual',
        asset_category: data.asset_category || 'real_estate',
        
        // Property details
        total_square_footage: data.total_square_footage || null,
        leasable_square_footage: data.leasable_square_footage || null,
        occupancy_rate: data.occupancy_rate || null,
        base_rent_psf: data.base_rent_psf || null,
        cam_charges: data.cam_charges || null,
        tax_rate_psf: data.tax_rate_psf || null,
        insurance_rate_psf: data.insurance_rate_psf || null,
        
        // Multi-tenant
        is_multi_tenant: data.is_multi_tenant || false,
        tenant_count: data.tenant_count || null,
        
        // Lease structure
        lease_type: data.lease_type || null,
        cam_recoverable: data.cam_recoverable || false,
        
        // Business operations
        is_owner_operated: data.is_owner_operated || false,
        linked_business_holding_id: data.linked_business_holding_id || null,
        
        // Optional fields
        description: data.description || null,
        notes: data.notes || null,
        
        // Default property fields
        status: 'available',
        on_market: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('properties')
        .insert(propertyData as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating commercial property:', error);
        throw error;
      }

      // Only geocode in background if coordinates weren't provided
      if (result?.id && !data.latitude && !data.longitude) {
        const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip_code}`;
        supabase.functions.invoke('geocode-address', {
          body: {
            property_id: result.id,
            address: fullAddress,
            country: data.country || 'US'
          }
        })
          .then(() => console.log('Commercial property geocoded successfully'))
          .catch((geocodeError) => console.error('Geocoding failed:', geocodeError));
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(data.owner_id) });
      
      if (data.portfolio_id) {
        queryClient.invalidateQueries({ queryKey: propertyKeys.byPortfolio(data.portfolio_id) });
      }

      toast({
        title: "Commercial Property Created",
        description: `${data.address} has been added successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Error creating commercial property:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create commercial property. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCommercialProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ propertyId, data }: { propertyId: string; data: Partial<CommercialPropertyData> }) => {
      // Map the commercial property data to database format
      const updateData = {
        // Basic fields
        address: data.address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        country: data.country || 'US',
        latitude: data.latitude !== undefined ? data.latitude : undefined,
        longitude: data.longitude !== undefined ? data.longitude : undefined,
        
        // Commercial specific fields
        commercial_type: data.commercial_type,
        commercial_subtype: data.commercial_subtype || null,
        asset_tags: data.asset_tags || [],
        source_badge: data.source_badge || 'manual',
        asset_category: data.asset_category || 'real_estate',
        
        // Property details
        total_square_footage: data.total_square_footage || null,
        leasable_square_footage: data.leasable_square_footage || null,
        occupancy_rate: data.occupancy_rate || null,
        base_rent_psf: data.base_rent_psf || null,
        cam_charges: data.cam_charges || null,
        tax_rate_psf: data.tax_rate_psf || null,
        insurance_rate_psf: data.insurance_rate_psf || null,
        
        // Multi-tenant
        is_multi_tenant: data.is_multi_tenant || false,
        tenant_count: data.tenant_count || null,
        
        // Lease structure
        lease_type: data.lease_type || null,
        cam_recoverable: data.cam_recoverable || false,
        
        // Business operations
        is_owner_operated: data.is_owner_operated || false,
        linked_business_holding_id: data.linked_business_holding_id || null,
        
        // Optional fields
        description: data.description || null,
        notes: data.notes || null,
        
        // Update timestamp
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('properties')
        .update(updateData as any)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating commercial property:', error);
        throw error;
      }

      return result;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: propertyKeys.byOwner(data.owner_id) });
      
      if (data.portfolio_id) {
        queryClient.invalidateQueries({ queryKey: propertyKeys.byPortfolio(data.portfolio_id) });
      }

      queryClient.invalidateQueries({ queryKey: propertyKeys.byId(data.id) });

      toast({
        title: "Commercial Property Updated",
        description: `${data.address} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Error updating commercial property:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update commercial property. Please try again.",
        variant: "destructive",
      });
    },
  });
}