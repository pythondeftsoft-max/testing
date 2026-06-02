import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentReminder {
  id: string;
  property_id: string;
  tenant_id: string;
  due_date: string;
  amount_due: number;
  sent_date: string | null;
  reminder_count: number;
  reminder_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  property?: {
    address: string;
    monthly_rent: number;
  };
  tenant?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const usePaymentReminders = (userId?: string, userType?: 'tenant' | 'landlord') => {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReminders = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('payment_reminders')
        .select(`
          *,
          property:properties(address, monthly_rent),
          tenant:profiles!payment_reminders_tenant_id_fkey(first_name, last_name, email)
        `);

      if (userType === 'tenant') {
        query = query.eq('tenant_id', userId);
      } else if (userType === 'landlord') {
        // First get property IDs for this landlord
        const { data: propertyIds } = await supabase
          .from('properties')
          .select('id')
          .eq('owner_id', userId);
        
        if (propertyIds && propertyIds.length > 0) {
          query = query.in('property_id', propertyIds.map(p => p.id));
        } else {
          // No properties found for this landlord
          setReminders([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error fetching payment reminders",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('payment_reminders')
        .update({
          sent_date: new Date().toISOString(),
          reminder_count: reminders.find(r => r.id === reminderId)?.reminder_count + 1 || 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);

      if (error) throw error;

      toast({
        title: "Reminder sent",
        description: "Payment reminder has been sent to the tenant.",
      });

      await fetchReminders();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error sending reminder",
        description: err.message,
      });
    }
  };

  const markAsCompleted = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('payment_reminders')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);

      if (error) throw error;

      toast({
        title: "Payment marked as completed",
        description: "The payment reminder has been marked as completed.",
      });

      await fetchReminders();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error updating reminder",
        description: err.message,
      });
    }
  };

  const generateMonthlyReminders = async (propertyIds?: string[]) => {
    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      let query = supabase.from('properties').select(`
        id, monthly_rent, 
        property_applications!inner(tenant_id, status)
      `).eq('property_applications.status', 'approved');

      if (propertyIds && propertyIds.length > 0) {
        query = query.in('id', propertyIds);
      } else if (userType === 'landlord' && userId) {
        query = query.eq('owner_id', userId);
      }

      const { data: properties, error: propertiesError } = await query;
      if (propertiesError) throw propertiesError;

      const newReminders = properties?.map(property => ({
        property_id: property.id,
        tenant_id: property.property_applications[0]?.tenant_id,
        due_date: nextMonth.toISOString().split('T')[0],
        amount_due: property.monthly_rent,
        reminder_type: 'monthly_rent',
        status: 'pending',
      })) || [];

      if (newReminders.length > 0) {
        const { error } = await supabase
          .from('payment_reminders')
          .insert(newReminders);

        if (error) throw error;

        toast({
          title: "Monthly reminders generated",
          description: `Generated ${newReminders.length} payment reminders for next month.`,
        });

        await fetchReminders();
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error generating reminders",
        description: err.message,
      });
    }
  };

  useEffect(() => {
    if (userId && userType) {
      fetchReminders();
    }
  }, [userId, userType]);

  return {
    reminders,
    loading,
    error,
    sendReminder,
    markAsCompleted,
    generateMonthlyReminders,
    refetchReminders: fetchReminders,
  };
};