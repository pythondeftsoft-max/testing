import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GrowthGoal {
  id: string;
  category: string;
  metric_name: string;
  timeframe: string;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string | null;
  phase: string;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthSnapshot {
  id: string;
  goal_id: string;
  value: number;
  recorded_at: string;
}

export const useGrowthGoals = (filters?: { category?: string; timeframe?: string; phase?: string }) => {
  return useQuery({
    queryKey: ['growth-goals', filters],
    queryFn: async () => {
      let query = supabase
        .from('growth_goals')
        .select('*')
        .order('category')
        .order('metric_name')
        .order('timeframe');

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.timeframe) query = query.eq('timeframe', filters.timeframe);
      if (filters?.phase) query = query.eq('phase', filters.phase);

      const { data, error } = await query;
      if (error) throw error;
      return data as GrowthGoal[];
    },
  });
};

export const useGrowthSnapshots = (goalId?: string) => {
  return useQuery({
    queryKey: ['growth-snapshots', goalId],
    queryFn: async () => {
      let query = supabase
        .from('growth_snapshots')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (goalId) query = query.eq('goal_id', goalId);

      const { data, error } = await query;
      if (error) throw error;
      return data as GrowthSnapshot[];
    },
    enabled: !!goalId,
  });
};

export const useUpdateGoalValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current_value }: { id: string; current_value: number }) => {
      const { error } = await supabase
        .from('growth_goals')
        .update({ current_value })
        .eq('id', id);
      if (error) throw error;

      // Also create a snapshot
      const { error: snapError } = await supabase
        .from('growth_snapshots')
        .insert({ goal_id: id, value: current_value });
      if (snapError) throw snapError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growth-goals'] });
      queryClient.invalidateQueries({ queryKey: ['growth-snapshots'] });
    },
  });
};
