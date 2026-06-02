import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StripeConnectionStatus {
  connected: boolean;
  accountId?: string;
  email?: string;
  businessName?: string;
  country?: string;
  currency?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  capabilities?: {
    card_payments: string;
    transfers: string;
    link_payments: string;
  };
  accountType?: string;
  created?: string;
  error?: string;
  errorType?: string;
}

export function useStripeConnection() {
  const [status, setStatus] = useState<StripeConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('test-stripe-connection');

      if (error) throw error;

      setStatus(data);

      if (data.connected) {
        toast({
          title: 'Stripe Connected',
          description: `Successfully connected to ${data.email || 'Stripe account'}`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect to Stripe',
          variant: 'destructive',
        });
      }

      return data;
    } catch (error: any) {
      console.error('Error testing Stripe connection:', error);
      const errorStatus = {
        connected: false,
        error: error.message || 'Failed to test connection',
      };
      setStatus(errorStatus);
      
      toast({
        title: 'Error',
        description: 'Failed to test Stripe connection',
        variant: 'destructive',
      });
      
      return errorStatus;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    isLoading,
    testConnection,
  };
}
