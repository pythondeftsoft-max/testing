import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortfolioLiability {
  id: string;
  portfolio_id: string;
  liability_name: string;
  liability_description: string | null;
  current_balance: number;
  original_amount: number | null;
  interest_rate: number | null;
  monthly_payment: number | null;
  maturity_date: string | null;
  liability_type: string;
  is_secured: boolean;
  collateral_asset_id: string | null;
  metadata: Record<string, any>;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateLiabilityParams {
  portfolio_id: string;
  liability_name: string;
  liability_description?: string;
  current_balance: number;
  original_amount?: number;
  interest_rate?: number;
  monthly_payment?: number;
  maturity_date?: string;
  liability_type?: string;
  is_secured?: boolean;
  collateral_asset_id?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export const usePortfolioLiabilities = (portfolioId?: string) => {
  return useQuery({
    queryKey: ['portfolio-liabilities', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      
      const { data, error } = await supabase
        .from('portfolio_liabilities')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PortfolioLiability[];
    },
    enabled: !!portfolioId,
    staleTime: 300000, // 5 minutes
  });
};

export const useCreateLiability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateLiabilityParams) => {
      const { data, error } = await supabase
        .from('portfolio_liabilities')
        .insert([params])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-liabilities'] });
      toast.success('Liability added successfully');
    },
    onError: (error: any) => {
      console.error('Error creating liability:', error);
      toast.error('Failed to add liability');
    },
  });
};

export const useUpdateLiability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PortfolioLiability> & { id: string }) => {
      const { data, error } = await supabase
        .from('portfolio_liabilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-liabilities'] });
      toast.success('Liability updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating liability:', error);
      toast.error('Failed to update liability');
    },
  });
};

export const useDeleteLiability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portfolio_liabilities')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-liabilities'] });
      toast.success('Liability deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting liability:', error);
      toast.error('Failed to delete liability');
    },
  });
};