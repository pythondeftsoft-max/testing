import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  notifyNewMaintenanceRequest,
  notifyHighPriority
} from '@/utils/notificationService';

interface UseLandlordMaintenanceNotificationsProps {
  userId: string;
  onNavigateToMessages?: (applicationId: string) => void;
}

export const useLandlordMaintenanceNotifications = ({ 
  userId, 
  onNavigateToMessages 
}: UseLandlordMaintenanceNotificationsProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 [Landlord Notifications] Setting up subscription for user:', userId);

    // Subscribe to new maintenance messages from tenants
    const channel = supabase
      .channel('landlord-maintenance-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `extension=eq.maintenance`
        },
        async (payload) => {
          console.log('🔔 [Landlord Notifications] New maintenance message received:', payload);
          const message = payload.new as any;

          // Check if this message is for a property owned by this landlord
          const { data: application, error } = await supabase
            .from('property_applications')
            .select('id, tenant_id, properties!inner(owner_id)')
            .eq('id', message.property_application_id)
            .single();

          if (error) {
            console.error('🔔 [Landlord Notifications] Error fetching application:', error);
            return;
          }

          console.log('🔔 [Landlord Notifications] Application data:', application);
          console.log('🔔 [Landlord Notifications] Owner ID:', application?.properties?.owner_id);
          console.log('🔔 [Landlord Notifications] Message sender ID:', message.sender_id);
          console.log('🔔 [Landlord Notifications] Current user ID:', userId);

          // Only notify if:
          // 1. This landlord owns the property
          // 2. The message was sent by the tenant (not by the landlord themselves)
          if (application?.properties?.owner_id === userId && message.sender_id !== userId) {
            console.log('🔔 [Landlord Notifications] Conditions met, showing notification');
            
            // Only show notifications for new maintenance requests from tenants
            if (message.event === 'maintenance_request_created') {
              const priority = message.payload?.priority || 'medium';
              const title = message.payload?.title || message.message_text;

              console.log('🔔 [Landlord Notifications] New maintenance request:', { title, priority });

              if (priority === 'high' || priority === 'urgent') {
                notifyHighPriority(title);
              } else {
                notifyNewMaintenanceRequest(title, priority);
              }

              // Optional: Navigate to the conversation
              if (onNavigateToMessages) {
                onNavigateToMessages(message.property_application_id);
              }
            }

            // Invalidate queries to refresh the message list
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
          } else {
            console.log('🔔 [Landlord Notifications] Conditions not met, skipping notification');
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 [Landlord Notifications] Subscription status:', status);
      });

    return () => {
      console.log('🔔 [Landlord Notifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, onNavigateToMessages, queryClient]);
};
