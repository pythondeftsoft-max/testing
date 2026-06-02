import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  description: string | null;
  features: string[];
  limits: Record<string, any>;
  target_audience: string | null;
  role: 'tenant' | 'landlord' | 'both';
  is_active: boolean;
  display_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscriptionPlans = (role?: string) => {
  return useQuery({
    queryKey: ['subscription-plans', role],
    queryFn: async () => {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (role) {
        query = query.or(`role.eq.${role},role.eq.both`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
};

export const useCreatePlan = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: any) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([plan])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Plan Created',
        description: 'Subscription plan has been successfully created.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create plan',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePlan = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Plan Updated',
        description: 'Subscription plan has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePlan = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      // Check for active subscribers first
      const { data: subscribers, error: checkError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('plan_type', planId)
        .eq('status', 'active')
        .limit(1);

      if (checkError) throw checkError;

      if (subscribers && subscribers.length > 0) {
        throw new Error('Cannot delete plan with active subscribers');
      }

      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Plan Deleted',
        description: 'Subscription plan has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete plan',
        variant: 'destructive',
      });
    },
  });
};

export const useSyncPlanToStripe = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-sync-plan-to-stripe', {
        body: { plan_id: planId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Synced to Stripe',
        description: 'Plan has been successfully synced with Stripe.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync plan with Stripe',
        variant: 'destructive',
      });
    },
  });
};
