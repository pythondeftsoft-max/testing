import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BulkPayoutBatch {
  id: string;
  created_by: string;
  portfolio_id?: string;
  batch_name: string;
  statement_date_range: string;
  total_amount: number;
  total_payouts: number;
  successful_payouts: number;
  failed_payouts: number;
  status: 'draft' | 'processing' | 'completed' | 'partial' | 'failed';
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BulkPayoutItem {
  id: string;
  batch_id: string;
  property_id?: string;
  landlord_id: string;
  payout_profile_id?: string;
  amount: number;
  payout_method: 'digital_check' | 'ach' | 'check';
  recipient_details: any;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  payout_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export const useBulkPayouts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createBatch = async (
    batchName: string,
    statementDateRange: string,
    portfolioId?: string
  ): Promise<BulkPayoutBatch | null> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bulk_payout_batches')
        .insert({
          created_by: user.id,
          portfolio_id: portfolioId,
          batch_name: batchName,
          statement_date_range: statementDateRange,
          status: 'draft' as const,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Batch Created',
        description: 'Bulk payout batch created successfully',
      });

      return data as BulkPayoutBatch;
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create batch',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const addItemsToBatch = async (
    batchId: string,
    items: Omit<BulkPayoutItem, 'id' | 'batch_id' | 'status' | 'created_at' | 'updated_at'>[]
  ) => {
    setIsLoading(true);
    try {
      const itemsWithBatchId = items.map(item => ({
        ...item,
        batch_id: batchId,
        status: 'pending' as const,
      }));

      const { data, error } = await supabase
        .from('bulk_payout_items')
        .insert(itemsWithBatchId)
        .select();

      if (error) throw error;

      // Update batch totals
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      await supabase
        .from('bulk_payout_batches')
        .update({
          total_amount: totalAmount,
          total_payouts: items.length,
        })
        .eq('id', batchId);

      toast({
        title: 'Items Added',
        description: `${items.length} payout items added to batch`,
      });

      return data;
    } catch (error: any) {
      console.error('Error adding items to batch:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add items to batch',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const processBatch = async (batchId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-bulk-payouts', {
        body: { batch_id: batchId },
      });

      if (error) throw error;

      toast({
        title: 'Batch Processing Started',
        description: 'Your bulk payouts are being processed',
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error processing batch:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process batch',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const getBatches = async (portfolioId?: string) => {
    try {
      let query = supabase
        .from('bulk_payout_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch batches',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const getBatchItems = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('bulk_payout_items')
        .select(`
          *,
          properties(address, monthly_rent),
          profiles!landlord_id(first_name, last_name)
        `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching batch items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch batch items',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const retryItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-bulk-payout-item', {
        body: { item_id: itemId, automated: false },
      });
      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Payout Retried',
          description: 'The payout was sent successfully.',
        });
      } else {
        toast({
          title: data?.failure_category === 'permanent' ? 'Permanent Failure' : 'Retry Failed',
          description: data?.error || 'Could not retry this payout.',
          variant: 'destructive',
        });
      }
      return data;
    } catch (error: any) {
      console.error('Error retrying item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to retry payout',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createBatch,
    addItemsToBatch,
    processBatch,
    getBatches,
    getBatchItems,
    retryItem,
  };
};