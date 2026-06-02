import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  notifyAppointmentScheduled,
  notifyAppointmentCancelled,
  notifyAppointmentUpdated 
} from '@/utils/notificationService';

interface UseAppointmentNotificationsProps {
  userId: string;
  userType: 'tenant' | 'landlord';
  onAppointmentChange?: () => void;
}

export const useAppointmentNotifications = ({ 
  userId, 
  userType,
  onAppointmentChange 
}: UseAppointmentNotificationsProps) => {
  useEffect(() => {
    const channel = supabase
      .channel('appointment-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'viewing_appointments',
        filter: `${userType === 'tenant' ? 'tenant_id' : 'landlord_id'}=eq.${userId}`
      }, async (payload) => {
        const appointment = payload.new;
        
        // Fetch property details
        const { data: propertyData } = await supabase
          .from('properties')
          .select('address')
          .eq('id', appointment.property_id)
          .single();
        
        notifyAppointmentScheduled(
          format(new Date(appointment.appointment_date), 'PPP'),
          format(new Date(appointment.appointment_date), 'p'),
          appointment.viewing_type,
          propertyData?.address || 'property'
        );
        
        onAppointmentChange?.();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'viewing_appointments',
        filter: `${userType === 'tenant' ? 'tenant_id' : 'landlord_id'}=eq.${userId}`
      }, async (payload) => {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('address')
          .eq('id', payload.new.property_id)
          .single();
        
        if (payload.new.status === 'cancelled') {
          notifyAppointmentCancelled(propertyData?.address || 'property');
        } else {
          notifyAppointmentUpdated(propertyData?.address || 'property');
        }
        
        onAppointmentChange?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userType, onAppointmentChange]);
};
