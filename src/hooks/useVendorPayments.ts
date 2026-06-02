import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VendorPaymentRecord {
  id?: string;
  landlord_id: string;
  portfolio_id?: string;
  property_id: string;
  unit_id?: string;
  vendor_id?: string;
  recipient_type: 'vendor' | 'owner' | 'other';
  recipient_name: string;
  amount: number;
  currency_code: string;
  payment_method: string;
  paid_at: string;
  reference?: string;
  memo?: string;
  attachment_url?: string;
  created_by: string;
  maintenance_request_id?: string | null;
}

export const useVendorPayments = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const recordPayment = async (payment: Omit<VendorPaymentRecord, 'id' | 'created_by'>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vendor_payment_records')
        .insert({
          ...payment,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-complete linked maintenance request if provided
      if (payment.maintenance_request_id) {
        const { error: updateError } = await supabase
          .from('maintenance_requests')
          .update({
            status: 'completed',
            completed_date: payment.paid_at,
            actual_cost: payment.amount
          })
          .eq('id', payment.maintenance_request_id);

        if (updateError) {
          console.error('Error updating maintenance request:', updateError);
          // Don't throw - payment was still recorded successfully
        }
      }

      toast({
        title: "Payment Recorded",
        description: `Payment of $${payment.amount} to ${payment.recipient_name} has been recorded.${payment.maintenance_request_id ? ' Maintenance request marked as completed.' : ''}`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentHistory = async (portfolioId?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      let query = supabase
        .from('vendor_payment_records')
        .select(`
          *,
          properties:property_id (
            address,
            owner_id
          )
        `)
        .eq('landlord_id', user.user.id);
      
      // If portfolioId is provided and not "everything", filter by portfolio
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error } = await query.order('paid_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      });
      return [];
    }
  };

  const updatePayment = async (id: string, updates: Partial<VendorPaymentRecord>) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vendor_payment_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Payment Updated",
        description: "Payment record has been updated successfully.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('vendor_payment_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Payment Deleted",
        description: "Payment record has been deleted successfully.",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    recordPayment,
    getPaymentHistory,
    updatePayment,
    deletePayment,
    loading
  };
};