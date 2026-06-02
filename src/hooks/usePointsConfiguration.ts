import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PointsConfig {
  id: string;
  action_key: string;
  action_label: string;
  entity_type: 'tenant' | 'property';
  from_stage: string | null;
  to_stage: string;
  points_value: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const usePointsConfiguration = () => {
  return useQuery({
    queryKey: ['points-configuration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_action_points_config')
        .select('*')
        .order('entity_type')
        .order('action_label');

      if (error) throw error;
      return data as PointsConfig[];
    },
  });
};

export const useUpdatePointsConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PointsConfig> }) => {
      const { data, error } = await supabase
        .from('worker_action_points_config')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-configuration'] });
      toast.success('Points configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration', {
        description: error.message,
      });
    },
  });
};

export const useCreatePointsConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<PointsConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('worker_action_points_config')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-configuration'] });
      toast.success('New action created');
    },
    onError: (error) => {
      toast.error('Failed to create action', {
        description: error.message,
      });
    },
  });
};

export const useDeletePointsConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('worker_action_points_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-configuration'] });
      toast.success('Action deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete action', {
        description: error.message,
      });
    },
  });
};
