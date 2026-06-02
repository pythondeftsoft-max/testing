import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  notifyNewMaintenanceRequest,
  notifyStatusUpdate,
  notifyVendorAssigned,
  notifyMaintenanceAppointmentScheduled,
  notifyRequestCompleted,
  notifyHighPriority,
} from '@/utils/notificationService';

interface UseMaintenanceNotificationsProps {
  userId?: string;
  onNavigateToMessages: (applicationId: string) => void;
}

export const useMaintenanceNotifications = ({
  userId,
  onNavigateToMessages,
}: UseMaintenanceNotificationsProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up maintenance notifications for user:', userId);

    // Subscribe to maintenance_requests changes
    const requestsChannel = supabase
      .channel('maintenance-requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maintenance_requests',
          filter: `tenant_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔔 Maintenance request updated:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Get application_id for navigation
          const { data: application } = await supabase
            .from('property_applications')
            .select('id')
            .eq('tenant_id', userId)
            .eq('property_id', newData.property_id)
            .single();

            const handleView = () => {
              if (application) {
                onNavigateToMessages(application.id);
              }
            };

            // Status change notification
            if (oldData.status !== newData.status) {
              notifyStatusUpdate(newData.status);
              handleView();
            }

            // Vendor assignment notification
            if (!oldData.assigned_vendor_id && newData.assigned_vendor_id) {
              const { data: vendor } = await supabase
                .from('maintenance_vendors')
                .select('company_name')
                .eq('id', newData.assigned_vendor_id)
                .single();

              if (vendor) {
                notifyVendorAssigned(vendor.company_name);
                handleView();
              }
            }

            // Completion notification
            if (oldData.status !== 'completed' && newData.status === 'completed') {
              notifyRequestCompleted();
              handleView();
            }

          queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
        }
      )
      .subscribe();

    // Subscribe to messages with maintenance extension
    const messagesChannel = supabase
      .channel('maintenance-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `extension=eq.maintenance`,
        },
        async (payload) => {
          console.log('🔔 New maintenance message:', payload);
          
          const message = payload.new as any;

          // Get application to check if it's for this user
          const { data: application } = await supabase
            .from('property_applications')
            .select('tenant_id')
            .eq('id', message.property_application_id)
            .single();

          if (application?.tenant_id === userId) {
            const handleView = () => {
              onNavigateToMessages(message.property_application_id);
            };

            // Show notification based on event type
            if (message.event === 'maintenance_request_created') {
              const priority = message.payload?.priority || 'medium';
              if (priority === 'high') {
                notifyHighPriority(message.message_text);
              } else {
                notifyNewMaintenanceRequest(
                  message.message_text.split('\n')[0].replace('🔧 **New Maintenance Request**: ', ''),
                  priority
                );
              }
              handleView();
            } else if (message.event === 'maintenance_status_changed') {
              notifyStatusUpdate(message.payload?.new_status || 'updated');
              handleView();
            } else if (message.event === 'maintenance_vendor_assigned') {
              notifyVendorAssigned(message.payload?.vendor_name || 'Vendor');
              handleView();
            } else if (message.event === 'maintenance_appointment_scheduled') {
              notifyMaintenanceAppointmentScheduled(
                message.payload?.scheduled_date || 'soon'
              );
              handleView();
            } else if (message.event === 'maintenance_completed') {
              notifyRequestCompleted();
              handleView();
            }

            queryClient.invalidateQueries({ queryKey: ['messages'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, queryClient, onNavigateToMessages]);
};
