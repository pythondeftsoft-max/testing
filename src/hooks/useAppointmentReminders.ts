import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import { notifyAppointmentReminder } from '@/utils/notificationService';

interface UseAppointmentRemindersProps {
  userId: string;
  userType: 'tenant' | 'landlord';
}

export const useAppointmentReminders = ({ 
  userId, 
  userType 
}: UseAppointmentRemindersProps) => {
  
  // Fetch upcoming appointments (next 24 hours)
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['upcoming-appointments', userId, userType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viewing_appointments')
        .select(`
          *,
          properties (address, city)
        `)
        .eq(userType === 'tenant' ? 'tenant_id' : 'landlord_id', userId)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString())
        .lte('appointment_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (!upcomingAppointments) return;

    const checkReminders = () => {
      const now = new Date();
      
      upcomingAppointments.forEach((appointment) => {
        const appointmentDate = new Date(appointment.appointment_date);
        const hoursUntil = differenceInHours(appointmentDate, now);
        const minutesUntil = differenceInMinutes(appointmentDate, now);
        
        // Create unique reminder keys
        const reminder24Key = `reminder-${appointment.id}-24h`;
        const reminder1hKey = `reminder-${appointment.id}-1h`;
        const reminder15mKey = `reminder-${appointment.id}-15m`;
        
        // 24 hours before
        if (hoursUntil === 24 && minutesUntil % 60 < 1) {
          if (!localStorage.getItem(reminder24Key)) {
            notifyAppointmentReminder(
              '24 hours',
              format(appointmentDate, 'PPP p'),
              appointment.viewing_type,
              appointment.properties?.address
            );
            localStorage.setItem(reminder24Key, 'shown');
          }
        }
        
        // 1 hour before
        if (hoursUntil === 1 && minutesUntil % 60 < 1) {
          if (!localStorage.getItem(reminder1hKey)) {
            notifyAppointmentReminder(
              '1 hour',
              format(appointmentDate, 'p'),
              appointment.viewing_type,
              appointment.properties?.address
            );
            localStorage.setItem(reminder1hKey, 'shown');
          }
        }
        
        // 15 minutes before
        if (minutesUntil === 15) {
          if (!localStorage.getItem(reminder15mKey)) {
            notifyAppointmentReminder(
              '15 minutes',
              format(appointmentDate, 'p'),
              appointment.viewing_type,
              appointment.properties?.address
            );
            localStorage.setItem(reminder15mKey, 'shown');
          }
        }

        // Clean up old reminders (after appointment has passed)
        if (appointmentDate < now) {
          localStorage.removeItem(reminder24Key);
          localStorage.removeItem(reminder1hKey);
          localStorage.removeItem(reminder15mKey);
        }
      });
    };

    // Check immediately and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [upcomingAppointments]);
};
