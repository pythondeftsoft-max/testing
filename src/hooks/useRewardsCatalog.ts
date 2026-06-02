import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface Reward {
  id: string;
  name: string;
  type: string;
  cost: number;
  description: string | null;
  status: string;
  image_url: string | null;
  terms_conditions: string | null;
  stock_quantity: number | null;
  is_flexible_amount: boolean;
  min_amount: number | null;
  max_amount: number | null;
  conversion_rate: number | null;
  brand_category: string | null;
  created_at: string;
  updated_at: string;
}

const REWARDS_KEYS = {
  all: ['rewards-catalog'] as const,
  list: () => [...REWARDS_KEYS.all, 'list'] as const,
  detail: (id: string) => [...REWARDS_KEYS.all, 'detail', id] as const,
};

export const useRewardsCatalog = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all rewards
  const { data: rewards, isLoading, error, refetch } = useQuery({
    queryKey: REWARDS_KEYS.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Reward[];
    },
  });

  // Create reward mutation
  const createRewardMutation = useMutation({
    mutationFn: async (newReward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert([newReward])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_KEYS.list() });
      toast({
        title: 'Success',
        description: 'Reward created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update reward mutation
  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reward> }) => {
      const { data, error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_KEYS.list() });
      toast({
        title: 'Success',
        description: 'Reward updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_KEYS.list() });
      toast({
        title: 'Success',
        description: 'Reward deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('rewards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rewards',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: REWARDS_KEYS.list() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    rewards: rewards || [],
    isLoading,
    error,
    refetch,
    createReward: createRewardMutation.mutateAsync,
    updateReward: updateRewardMutation.mutateAsync,
    deleteReward: deleteRewardMutation.mutateAsync,
    isCreating: createRewardMutation.isPending,
    isUpdating: updateRewardMutation.isPending,
    isDeleting: deleteRewardMutation.isPending,
  };
};
