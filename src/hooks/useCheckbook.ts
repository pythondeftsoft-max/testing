import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreatePayoutRequest {
  landlord_id: string;
  portfolio_id?: string;
  property_id?: string;
  amount: number;
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  payout_method: 'check' | 'digital_check' | 'ach';
  memo?: string;
  source_account_name?: string;
  source_account_id?: string;
  due_date?: string;
}

interface CreateDraftPayoutRequest {
  user_id: string;
  landlord_id: string;
  portfolio_id?: string;
  property_id?: string;  
  total_amount: number;
  recipient_details: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  payout_method: 'check' | 'digital_check' | 'ach';
  memo?: string;
  source_account_name?: string;
  source_account_id?: string;
  due_date?: string;
}

interface TestResult {
  timestamp: string;
  user_id: string;
  tests: Array<{
    test: string;
    status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO';
    details: any;
  }>;
}

export const useCheckbook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createDraftPayout = async (request: CreateDraftPayoutRequest) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payouts')
        .insert([{
          user_id: request.user_id,
          landlord_id: request.landlord_id,
          portfolio_id: request.portfolio_id,
          property_id: request.property_id,
          total_amount: request.total_amount,
          recipient_details: request.recipient_details,
          payout_method: request.payout_method,
          memo: request.memo,
          source_account_name: request.source_account_name,
          source_account_id: request.source_account_id,
          due_date: request.due_date,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Draft Payout Created",
        description: `Draft payout for $${request.total_amount} has been saved`,
      });
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating draft payout:', error);
      toast({
        title: "Failed to Create Draft",
        description: error.message || 'Failed to create draft payout',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const sendPayout = async (payoutId: string) => {
    setIsLoading(true);
    try {
      // Get the payout details first
      const { data: payout, error: fetchError } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payoutId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Convert to the format expected by the edge function
      const checkbookRequest: CreatePayoutRequest = {
        landlord_id: payout.landlord_id,
        portfolio_id: payout.portfolio_id,
        property_id: payout.property_id,
        amount: payout.total_amount,
        recipient: typeof payout.recipient_details === 'string' 
          ? JSON.parse(payout.recipient_details)
          : payout.recipient_details,
        payout_method: payout.payout_method as 'check' | 'digital_check' | 'ach',
        memo: payout.memo,
        source_account_name: payout.source_account_name,
        source_account_id: payout.source_account_id
      };

      // Send to Checkbook via edge function
      const { data, error } = await supabase.functions.invoke('create-checkbook-payout', {
        body: { ...checkbookRequest, payout_id: payoutId }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Payment Sent",
          description: `${checkbookRequest.payout_method} payment for $${checkbookRequest.amount} has been sent`,
        });
        return { success: true, data };
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error sending payout:', error);
      toast({
        title: "Failed to Send Payment",
        description: error.message || 'Failed to send payment',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createPayout = async (request: CreatePayoutRequest) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkbook-payout', {
        body: request
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Payout Created",
          description: `Successfully created ${request.payout_method} payout for $${request.amount}`,
        });
        return { success: true, data };
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Error creating payout:', error);
      toast({
        title: "Payout Failed",
        description: error.message || 'Failed to create payout',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (): Promise<TestResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('checkbook-test', {});

      if (error) {
        throw error;
      }

      toast({
        title: "Test Completed",
        description: "Checkbook integration test completed. Check the results below.",
      });

      return data;
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Failed to test Checkbook connection',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getPayouts = async (landlordId: string, portfolioId?: string) => {
    try {
      let query = supabase
        .from('payouts')
        .select(`
          *,
          recipient_details,
          properties!property_id(address, monthly_rent)
        `)
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to fetch payouts',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  return {
    createDraftPayout,
    sendPayout,
    createPayout,
    testConnection,
    getPayouts,
    isLoading
  };
};