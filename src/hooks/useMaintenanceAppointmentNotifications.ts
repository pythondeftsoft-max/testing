import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyMaintenanceAppointmentScheduled } from '@/utils/notificationService';

interface UseMaintenanceAppointmentNotificationsProps {
  userId: string;
  onAppointmentScheduled?: () => void;
}

export const useMaintenanceAppointmentNotifications = ({
  userId,
  onAppointmentScheduled,
}: UseMaintenanceAppointmentNotificationsProps) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('maintenance-appointment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maintenance_appointments',
        },
        async (payload) => {
          console.log('New maintenance appointment:', payload);
          const appointment = payload.new as any;

          // Check direct tenant_id match FIRST (most common case)
          if (appointment.tenant_id === userId) {
            const dateStr = new Date(appointment.scheduled_date).toLocaleString();
            notifyMaintenanceAppointmentScheduled(`${dateStr}`);
            onAppointmentScheduled?.();
            return;
          }

          // If there's a maintenance request, check if it belongs to this tenant
          if (appointment.maintenance_request_id) {
            const { data: request } = await supabase
              .from('maintenance_requests')
              .select('tenant_id, title, properties(address)')
              .eq('id', appointment.maintenance_request_id)
              .single();

            if (request && request.tenant_id === userId) {
              // This appointment is for the current tenant's maintenance request
              const propertyAddress = (request.properties as any)?.address || 'your property';
              const dateStr = new Date(appointment.scheduled_date).toLocaleString();
              notifyMaintenanceAppointmentScheduled(`${dateStr} at ${propertyAddress}`);
              onAppointmentScheduled?.();
            }
          } else if (appointment.property_id) {
            // Check if this property has a unit the tenant is associated with
            const { data: tenantUnit } = await supabase
              .from('property_units')
              .select('id, properties(address)')
              .eq('property_id', appointment.property_id)
              .eq('tenant_id', userId)
              .maybeSingle();

            if (tenantUnit) {
              const propertyAddress = (tenantUnit.properties as any)?.address || 'your property';
              const dateStr = new Date(appointment.scheduled_date).toLocaleString();
              notifyMaintenanceAppointmentScheduled(`${dateStr} at ${propertyAddress}`);
              onAppointmentScheduled?.();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onAppointmentScheduled]);
};
