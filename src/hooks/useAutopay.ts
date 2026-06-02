import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'us_bank_account';
  last_four: string;
  brand: string;
  is_default: boolean;
}

export interface AutopaySchedule {
  id: string;
  property_id: string;
  payment_method_id: string;
  payment_method_type: string;
  autopay_day: number;
  amount: number;
  status: string;
  next_payment_date: string;
  failure_count: number;
  last_failure_reason?: string;
}

export interface SubscriptionAutopaySchedule {
  id: string;
  user_id?: string;
  subscription_id?: string;
  payment_method_id: string;
  renewal_day: number;
  amount: number;
  status: string;
  next_renewal_date: string;
  failure_count: number | null;
  last_failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutopay() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [autopaySchedules, setAutopaySchedules] = useState<AutopaySchedule[]>([]);
  const [subscriptionAutopaySchedules, setSubscriptionAutopaySchedules] = useState<SubscriptionAutopaySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedData: PaymentMethod[] = (data || []).map(item => ({
        id: item.id,
        stripe_payment_method_id: item.stripe_payment_method_id,
        type: item.type as 'card' | 'us_bank_account',
        last_four: item.last_four || '',
        brand: item.brand || '',
        is_default: item.is_default || false
      }));
      
      setPaymentMethods(typedData);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    }
  };

  const fetchAutopaySchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('autopay_schedules')
        .select(`
          *,
          properties!inner(address, monthly_rent)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutopaySchedules(data || []);
    } catch (error) {
      console.error('Error fetching autopay schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load autopay schedules",
        variant: "destructive",
      });
    }
  };

  const fetchSubscriptionAutopaySchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_autopay_schedules')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptionAutopaySchedules(data || []);
    } catch (error) {
      console.error('Error fetching subscription autopay schedules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subscription autopay schedules",
        variant: "destructive",
      });
    }
  };

  const setupPaymentMethod = async (paymentMethodTypes: string[] = ['card']) => {
    try {
      setLoading(true);
      
      console.log('Setting up payment method with types:', paymentMethodTypes);
      
      const { data, error } = await supabase.functions.invoke('setup-payment-method', {
        body: { payment_method_types: paymentMethodTypes }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Payment method setup response:', data);
      return data;
    } catch (error) {
      console.error('Error setting up payment method:', error);
      
      // Try to parse the actual error message from the response
      let errorMessage = 'Failed to set up payment method';
      
      if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if ('details' in error && typeof error.details === 'string') {
          errorMessage = error.details;
        }
      }
      
      toast({
        title: "Payment Method Setup Failed",
        description: errorMessage.includes('Invalid API Key') 
          ? "Invalid Stripe API key. Please check your configuration."
          : errorMessage.includes('400')
          ? "Payment method type not supported. Please try a different payment method."
          : errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const confirmPaymentMethod = async (setupIntentId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('confirm-payment-method', {
        body: { setup_intent_id: setupIntentId }
      });

      if (error) throw error;
      
      // Refresh payment methods
      await fetchPaymentMethods();
      
      toast({
        title: "Success",
        description: "Payment method added successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error confirming payment method:', error);
      toast({
        title: "Error",
        description: "Failed to confirm payment method",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setupRentAutopay = async (params: {
    property_id: string;
    payment_method_id: string;
    autopay_day: number;
    amount: number;
  }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('setup-rent-autopay', {
        body: params
      });

      if (error) throw error;
      
      // Refresh autopay schedules
      await fetchAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Rent autopay set up successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error setting up rent autopay:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set up rent autopay';
      toast({
        title: "Autopay Setup Failed", 
        description: errorMessage.includes('Invalid API Key')
          ? "Invalid Stripe API key. Please check your configuration."
          : errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleAutopayStatus = async (scheduleId: string, status: 'active' | 'paused') => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .update({ status })
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchAutopaySchedules();
      
      toast({
        title: "Success",
        description: `Autopay ${status === 'active' ? 'activated' : 'paused'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling autopay status:', error);
      toast({
        title: "Error",
        description: "Failed to update autopay status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAutopaySchedule = async (scheduleId: string, params: {
    autopay_day?: number;
    amount?: number;
    payment_method_id?: string;
  }) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .update(params)
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Autopay schedule updated successfully",
      });
    } catch (error) {
      console.error('Error updating autopay schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update autopay schedule",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAutopaySchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('autopay_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Autopay schedule deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting autopay schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete autopay schedule",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;
      
      await fetchPaymentMethods();
      
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Subscription autopay methods
  const setupSubscriptionAutopay = async (params: {
    payment_method_id: string;
    renewal_day: number;
    amount: number;
  }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('setup-subscription-autopay', {
        body: params
      });

      if (error) throw error;

      await fetchSubscriptionAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Subscription autopay set up successfully",
      });

      return data;
    } catch (error) {
      console.error('Error setting up subscription autopay:', error);
      toast({
        title: "Error",
        description: "Failed to set up subscription autopay",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionAutopaySchedule = async (scheduleId: string, params: {
    renewal_day?: number;
    amount?: number;
    payment_method_id?: string;
  }) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('subscription_autopay_schedules')
        .update(params)
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchSubscriptionAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Subscription autopay updated successfully",
      });
    } catch (error) {
      console.error('Error updating subscription autopay:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription autopay",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSubscriptionAutopaySchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('subscription_autopay_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchSubscriptionAutopaySchedules();
      
      toast({
        title: "Success",
        description: "Subscription autopay deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting subscription autopay:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription autopay",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscriptionAutopayStatus = async (scheduleId: string, status: 'active' | 'paused') => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('subscription_autopay_schedules')
        .update({ status })
        .eq('id', scheduleId);

      if (error) throw error;
      
      await fetchSubscriptionAutopaySchedules();
      
      toast({
        title: "Success",
        description: `Subscription autopay ${status === 'active' ? 'activated' : 'paused'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling subscription autopay status:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription autopay status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPaymentMethods();
    fetchAutopaySchedules();
    fetchSubscriptionAutopaySchedules();
  }, []);

  return {
    paymentMethods,
    autopaySchedules,
    subscriptionAutopaySchedules,
    loading,
    setupPaymentMethod,
    confirmPaymentMethod,
    setupRentAutopay,
    updateAutopaySchedule,
    deleteAutopaySchedule,
    toggleAutopayStatus,
    deletePaymentMethod,
    setupSubscriptionAutopay,
    updateSubscriptionAutopaySchedule,
    deleteSubscriptionAutopaySchedule,
    toggleSubscriptionAutopayStatus,
    refreshData: () => {
      fetchPaymentMethods();
      fetchAutopaySchedules();
      fetchSubscriptionAutopaySchedules();
    }
  };
}