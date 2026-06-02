import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaxIrisBatch {
  id: string;
  portfolio_id: string;
  tax_year: number;
  status: 'draft' | 'validating' | 'ready' | 'submitting' | 'submitted' | 'accepted' | 'rejected' | 'failed';
  submission_id?: string | null;
  transmission_id?: string | null;
  total_forms: number;
  accepted_count: number;
  rejected_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface TaxIrisBatchItem {
  id: string;
  batch_id: string;
  portfolio_id: string;
  tax_year: number;
  recipient_id?: string | null;
  form_type: string;
  form_total: number;
  related_form_id?: string | null;
  status: 'pending' | 'validated' | 'queued' | 'submitted' | 'accepted' | 'rejected' | 'error';
  error_code?: string | null;
  error_message?: string | null;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useIrisBatches = (portfolioId?: string, year?: number) => {
  return useQuery({
    queryKey: ['iris-batches', portfolioId, year],
    enabled: !!(portfolioId && year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_iris_batches')
        .select('*')
        .eq('portfolio_id', portfolioId!)
        .eq('tax_year', year!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TaxIrisBatch[];
    },
  });
};

export const useCreateAndPopulateBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { portfolioId: string; year: number; userId: string }) => {
      // 1) Create batch
      const { data: batch, error: createErr } = await supabase
        .from('tax_iris_batches')
        .insert({
          portfolio_id: params.portfolioId,
          tax_year: params.year,
          status: 'draft',
          created_by: params.userId,
        })
        .select('*')
        .single();
      if (createErr) throw createErr;

      // 2) Pull generated 1099 forms for this portfolio/year
      const { data: forms, error: formsErr } = await supabase
        .from('tax_forms_1099')
        .select('id, payee_id, form_type, total_amount, tax_year, portfolio_id, form_status')
        .eq('portfolio_id', params.portfolioId)
        .eq('tax_year', params.year)
        .eq('form_status', 'generated');
      if (formsErr) throw formsErr;

      // 3) Insert batch items
      if (forms && forms.length > 0) {
        const items = forms.map((f) => ({
          batch_id: batch.id,
          portfolio_id: params.portfolioId,
          tax_year: params.year,
          recipient_id: f.payee_id,
          form_type: f.form_type,
          form_total: f.total_amount,
          related_form_id: f.id,
          status: 'pending',
          payload: {},
        }));
        const { error: itemsErr } = await supabase
          .from('tax_iris_batch_items')
          .insert(items);
        if (itemsErr) throw itemsErr;

        // Update batch counters
        const { error: updErr } = await supabase
          .from('tax_iris_batches')
          .update({ total_forms: items.length })
          .eq('id', batch.id);
        if (updErr) throw updErr;
      }

      return batch as TaxIrisBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iris-batches'] });
      toast.success('IRS batch created');
    },
    onError: (e: any) => toast.error(`Failed to create batch: ${e.message}`),
  });
};

export const useInvokeIris = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { batchId: string; action: 'validate' | 'submit' | 'status' }) => {
      const { data, error } = await supabase.functions.invoke('iris-efile-submit', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iris-batches'] });
      queryClient.invalidateQueries({ queryKey: ['tax1099Forms'] });
    },
    onError: (e: any) => toast.error(`IRS action failed: ${e.message}`),
  });
};
