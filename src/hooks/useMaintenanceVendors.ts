
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type MaintenanceVendor = Database['public']['Tables']['maintenance_vendors']['Row'];
type MaintenanceVendorInsert = Database['public']['Tables']['maintenance_vendors']['Insert'];
type MaintenanceVendorUpdate = Database['public']['Tables']['maintenance_vendors']['Update'];
type MaintenanceSpecialty = Database['public']['Enums']['maintenance_specialty'];

export interface CreateVendorParams {
  account_id?: string;
  portfolio_id?: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address?: string;
  specialties: MaintenanceSpecialty[];
  hourly_rate?: number;
  notes?: string;
  availability_schedule?: any;
  emergency_contact?: boolean;
  insurance_verified?: boolean;
  license_number?: string;
}

export interface UpdateVendorParams extends Partial<CreateVendorParams> {
  id: string;
}

export const useMaintenanceVendors = (portfolioId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const vendorsQuery = useQuery({
    queryKey: ['maintenance-vendors', portfolioId],
    queryFn: async () => {
      console.log('Fetching maintenance vendors for portfolio:', portfolioId);
      
      let query = supabase
        .from('maintenance_vendors')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance vendors:', error);
        throw error;
      }

      console.log('Fetched maintenance vendors:', data);
      return data as MaintenanceVendor[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vendors'
        },
        (payload) => {
          console.log('Real-time maintenance vendor change:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-vendors'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createVendor = useMutation({
    mutationFn: async (params: CreateVendorParams) => {
      const insertData: MaintenanceVendorInsert = {
        ...params,
        specialties: params.specialties as MaintenanceSpecialty[]
      };

      const { data, error } = await supabase
        .from('maintenance_vendors')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-vendors'] });
      toast({
        title: "Vendor Created",
        description: "Maintenance vendor has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create maintenance vendor",
        variant: "destructive",
      });
    },
  });

  const updateVendor = useMutation({
    mutationFn: async (params: UpdateVendorParams) => {
      const { id, ...updateData } = params;
      
      const updatePayload: MaintenanceVendorUpdate = {
        ...updateData,
        specialties: updateData.specialties as MaintenanceSpecialty[] | undefined
      };

      const { data, error } = await supabase
        .from('maintenance_vendors')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-vendors'] });
      toast({
        title: "Vendor Updated",
        description: "Maintenance vendor has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance vendor",
        variant: "destructive",
      });
    },
  });

  const deleteVendor = useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase
        .from('maintenance_vendors')
        .update({ is_active: false })
        .eq('id', vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-vendors'] });
      toast({
        title: "Vendor Deactivated",
        description: "Maintenance vendor has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error deactivating vendor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate maintenance vendor",
        variant: "destructive",
      });
    },
  });

  return {
    vendors: vendorsQuery.data || [],
    isLoading: vendorsQuery.isLoading,
    error: vendorsQuery.error,
    createVendor,
    updateVendor,
    deleteVendor,
  };
};

export const useAvailableVendors = (propertyId?: string, specialty?: MaintenanceSpecialty) => {
  const queryClient = useQueryClient();

  const availableVendorsQuery = useQuery({
    queryKey: ['available-vendors', propertyId, specialty],
    queryFn: async () => {
      if (!propertyId) return [];

      console.log('Fetching available vendors for property:', propertyId, 'specialty:', specialty);
      
      const { data, error } = await supabase
        .rpc('get_available_vendors', {
          p_property_id: propertyId,
          p_specialty: specialty || null
        });

      if (error) {
        console.error('Error fetching available vendors:', error);
        throw error;
      }

      console.log('Available vendors:', data);
      return data as MaintenanceVendor[];
    },
    enabled: !!propertyId,
  });

  // Real-time subscription for available vendors
  useEffect(() => {
    if (!propertyId) return;

    const channel = supabase
      .channel('available-vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vendors'
        },
        (payload) => {
          console.log('Real-time vendor change affecting availability:', payload);
          queryClient.invalidateQueries({ queryKey: ['available-vendors'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, propertyId]);

  return availableVendorsQuery;
};

export type { MaintenanceVendor, MaintenanceSpecialty };
