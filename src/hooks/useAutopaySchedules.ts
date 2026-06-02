import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutopaySchedule {
  id: string;
  tenant_id: string;
  asset_id: string;
  autopay_day: number;
  amount: number;
  currency_code: string;
  next_payment_date: string;
  status: string;
  failure_count: number;
  last_failure_reason?: string;
  payment_method_id?: string;
  payment_method_type: string;
  created_at: string;
  updated_at: string;
  asset?: {
    asset_name: string;
    portfolio_id: string;
  };
  tenant?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export const useAutopaySchedules = (portfolioId?: string) => {
  return useQuery({
    queryKey: ['autopay-schedules', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('asset_autopay_schedules')
        .select(`
          *,
          asset:portfolio_assets(asset_name, portfolio_id),
          tenant:profiles(email, first_name, last_name)
        `)
        .order('next_payment_date', { ascending: true });

      if (portfolioId) {
        query = query.eq('asset.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching autopay schedules:', error);
        throw error;
      }

      return (data as any[]) || [];
    },
    enabled: true,
  });
};

export const useAutopayScheduleByAsset = (assetId: string) => {
  return useQuery({
    queryKey: ['autopay-schedule', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_autopay_schedules')
        .select(`
          *,
          asset:portfolio_assets(asset_name, portfolio_id)
        `)
        .eq('asset_id', assetId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching autopay schedule:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!assetId,
  });
};

export const useCreateAutopaySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: any) => {
      const { data, error } = await supabase
        .from('asset_autopay_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) {
        console.error('Error creating autopay schedule:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopay-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['autopay-schedule'] });
    },
  });
};

export const useUpdateAutopaySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutopaySchedule> }) => {
      const { data, error } = await supabase
        .from('asset_autopay_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating autopay schedule:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopay-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['autopay-schedule'] });
    },
  });
};

export const useDeleteAutopaySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_autopay_schedules')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        console.error('Error deleting autopay schedule:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopay-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['autopay-schedule'] });
    },
  });
};