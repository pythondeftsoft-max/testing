import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBackgroundCheckPayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPaymentSession = async (tenantId: string, quantity: number = 1) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-background-check-payment', {
        body: { tenantId, quantity }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

      return data;
    } catch (error: any) {
      console.error('Error creating payment session:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment session",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentSession,
    loading,
  };
};
