import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IMPLEMENTATION_KEYS } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type ImplementationTask = Database['public']['Tables']['implementation_tasks']['Row'];
type ImplementationTaskInsert = Database['public']['Tables']['implementation_tasks']['Insert'];
type ImplementationTaskUpdate = Database['public']['Tables']['implementation_tasks']['Update'];

export const useImplementationTasks = () => {
  return useQuery({
    queryKey: IMPLEMENTATION_KEYS.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('implementation_tasks')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ImplementationTask[];
    },
  });
};

export const useCreateImplementationTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: ImplementationTaskInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('implementation_tasks')
        .insert({
          ...task,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });
};

export const useUpdateImplementationTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ImplementationTaskUpdate }) => {
      const { data, error } = await supabase
        .from('implementation_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    },
  });
};

export const useDeleteImplementationTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('implementation_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    },
  });
};

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: ImplementationTaskUpdate }) => {
      const promises = ids.map(id =>
        supabase
          .from('implementation_tasks')
          .update(updates)
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
    },
    onError: (error) => {
      console.error('Error bulk updating tasks:', error);
    },
  });
};

export const useBulkDeleteTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('implementation_tasks')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
    },
    onError: (error) => {
      console.error('Error bulk deleting tasks:', error);
    },
  });
};

export const useGenerateSubtasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('generate-subtasks', {
        body: { taskIds }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
      if (data?.successCount) {
        toast.success(`Generated subtasks for ${data.successCount} of ${data.totalCount} tasks`);
      }
    },
    onError: (error) => {
      console.error('Error generating subtasks:', error);
      toast.error('Failed to generate subtasks');
    },
  });
};
