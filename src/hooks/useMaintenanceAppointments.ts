
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface MaintenanceAppointment {
  id: string;
  maintenance_request_id: string;
  vendor_id?: string;
  property_id?: string;
  unit_id?: string;
  scheduled_date: string;
  estimated_duration: number;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  tenant_confirmed: boolean;
  vendor_confirmed: boolean;
  is_recurring: boolean;
  recurring_pattern?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Enriched data from joins
  property_address?: string;
  unit_name?: string;
  vendor_name?: string;
  tenant_name?: string;
  portfolio_id?: string;
}

export interface CreateAppointmentParams {
  maintenance_request_id?: string;
  vendor_id?: string;
  scheduled_date: string;
  estimated_duration?: number;
  notes?: string;
  is_recurring?: boolean;
  recurring_pattern?: any;
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
}

export interface UpdateAppointmentParams extends Partial<CreateAppointmentParams> {
  id: string;
  status?: MaintenanceAppointment['status'];
  actual_start_time?: string;
  actual_end_time?: string;
  tenant_confirmed?: boolean;
  vendor_confirmed?: boolean;
}

export const useMaintenanceAppointments = (portfolioId?: string, requestId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: ['maintenance-appointments', portfolioId, requestId],
    queryFn: async () => {
      console.log('useMaintenanceAppointments: Fetching via RPC get_landlord_appointments for portfolio:', portfolioId);
      
      // Use SECURITY DEFINER function to bypass RLS
      const { data, error } = await supabase.rpc('get_landlord_appointments', {
        p_portfolio_id: portfolioId && portfolioId !== 'everything' ? portfolioId : null
      });

      console.log('useMaintenanceAppointments: RPC result:', { count: data?.length, error });

      if (error) {
        console.error('Error fetching maintenance appointments:', error);
        throw error;
      }

      // Filter by request ID if specified (client-side since RPC doesn't support this)
      let appointments = (data || []).map((apt: any) => ({
        id: apt.id,
        maintenance_request_id: apt.maintenance_request_id,
        vendor_id: apt.vendor_id,
        property_id: apt.property_id,
        unit_id: apt.unit_id,
        scheduled_date: apt.scheduled_date,
        estimated_duration: apt.estimated_duration,
        status: apt.status,
        notes: apt.notes,
        tenant_confirmed: apt.tenant_confirmed,
        vendor_confirmed: apt.vendor_confirmed,
        property_address: apt.property_address,
        unit_name: apt.unit_name,
        vendor_name: apt.vendor_name,
        tenant_name: apt.tenant_name,
        portfolio_id: apt.portfolio_id,
      }));

      if (requestId) {
        appointments = appointments.filter((apt: any) => apt.maintenance_request_id === requestId);
      }

      console.log('Fetched maintenance appointments:', appointments);
      return appointments as MaintenanceAppointment[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_appointments'
        },
        (payload) => {
          console.log('Real-time maintenance appointment change:', payload);
          queryClient.invalidateQueries({ queryKey: ['maintenance-appointments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createAppointment = useMutation({
    mutationFn: async (params: CreateAppointmentParams) => {
      // Use SECURITY DEFINER function to bypass RLS
      const { data, error } = await supabase.rpc('create_maintenance_appointment', {
        p_property_id: params.property_id,
        p_scheduled_date: params.scheduled_date,
        p_maintenance_request_id: params.maintenance_request_id || null,
        p_vendor_id: params.vendor_id || null,
        p_unit_id: params.unit_id || null,
        p_tenant_id: params.tenant_id || null,
        p_estimated_duration: params.estimated_duration || 0,
        p_notes: params.notes || null,
        p_is_recurring: params.is_recurring || false,
        p_recurring_pattern: params.recurring_pattern || null,
      });

      if (error) throw error;
      const appointmentData = Array.isArray(data) ? data[0] : data;
      return { data: appointmentData, params };
    },
    onSuccess: async ({ data, params }) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-appointments'] });
      
      // Send notification to tenant if tenant_id is set
      if (params.tenant_id) {
        try {
          const scheduledDate = new Date(params.scheduled_date);
          const formattedDate = scheduledDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          
          await supabase.from('notifications').insert({
            user_id: params.tenant_id,
            type: 'maintenance',
            title: '🔧 Maintenance Appointment Scheduled',
            description: `A maintenance appointment has been scheduled for ${formattedDate}. Please ensure access to the property.`,
          });
          console.log('Tenant notification sent for appointment:', data.id);
        } catch (notifError) {
          console.error('Failed to send tenant notification:', notifError);
        }
      }
      
      toast({
        title: "Appointment Scheduled",
        description: "Maintenance appointment has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule maintenance appointment",
        variant: "destructive",
      });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (params: UpdateAppointmentParams) => {
      const { id, ...updateData } = params;
      const { data, error } = await supabase
        .from('maintenance_appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-appointments'] });
      toast({
        title: "Appointment Updated",
        description: "Maintenance appointment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance appointment",
        variant: "destructive",
      });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('maintenance_appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-appointments'] });
      toast({
        title: "Appointment Cancelled",
        description: "Maintenance appointment has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel maintenance appointment",
        variant: "destructive",
      });
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};

export const useCheckVendorAvailability = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { vendorId: string; startTime: string; duration?: number }) => {
      const { data, error } = await supabase
        .rpc('check_vendor_availability', {
          p_vendor_id: params.vendorId,
          p_start_time: params.startTime,
          p_duration: params.duration || 120
        });

      if (error) throw error;
      // The RPC returns an array with one object, so we extract the first element
      if (Array.isArray(data) && data.length > 0) {
        return data[0].is_available ?? false;
      }
      return (data as any)?.is_available ?? false;
    },
    onError: (error: any) => {
      console.error('Error checking vendor availability:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check vendor availability",
        variant: "destructive",
      });
    },
  });
};
