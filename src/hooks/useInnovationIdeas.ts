import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InnovationIdea, InnovationIdeaInsert, InnovationIdeaUpdate } from '@/types/innovation';

export const INNOVATION_KEYS = {
  all: ['innovation-ideas'] as const,
  lists: () => [...INNOVATION_KEYS.all, 'list'] as const,
  list: (filters?: string) => [...INNOVATION_KEYS.lists(), { filters: filters || 'all' }] as const,
  details: () => [...INNOVATION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INNOVATION_KEYS.details(), id] as const,
};

export const useInnovationIdeas = (statusFilter?: string) => {
  return useQuery({
    queryKey: INNOVATION_KEYS.list(statusFilter),
    queryFn: async () => {
      let query = supabase
        .from('innovation_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InnovationIdea[];
    },
  });
};

export const useInnovationIdea = (id: string) => {
  return useQuery({
    queryKey: INNOVATION_KEYS.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('innovation_ideas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as InnovationIdea;
    },
    enabled: !!id,
  });
};

export const useCreateInnovationIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idea: Partial<InnovationIdeaInsert>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('innovation_ideas')
        .insert({
          ...idea,
          user_id: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as InnovationIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INNOVATION_KEYS.all });
      toast.success('Idea captured successfully!');
    },
    onError: (error) => {
      console.error('Error creating idea:', error);
      toast.error('Failed to capture idea');
    },
  });
};

export const useUpdateInnovationIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InnovationIdeaUpdate }) => {
      const { data, error } = await supabase
        .from('innovation_ideas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InnovationIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INNOVATION_KEYS.all });
      toast.success('Idea updated');
    },
    onError: (error) => {
      console.error('Error updating idea:', error);
      toast.error('Failed to update idea');
    },
  });
};

export const useDeleteInnovationIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('innovation_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INNOVATION_KEYS.all });
      toast.success('Idea deleted');
    },
    onError: (error) => {
      console.error('Error deleting idea:', error);
      toast.error('Failed to delete idea');
    },
  });
};

export const useApproveIdea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, taskData }: { 
      ideaId: string; 
      taskData: { title: string; description: string; category: string; priority: string } 
    }) => {
      // Create implementation task
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: task, error: taskError } = await supabase
        .from('implementation_tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority,
          status: 'pending',
          source: 'innovation_inbox',
          created_by: user?.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Update idea with task reference
      const { error: updateError } = await supabase
        .from('innovation_ideas')
        .update({
          status: 'approved',
          implementation_task_id: task.id,
        })
        .eq('id', ideaId);

      if (updateError) throw updateError;

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INNOVATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['implementation-tasks'] });
      toast.success('Idea approved and task created!');
    },
    onError: (error) => {
      console.error('Error approving idea:', error);
      toast.error('Failed to approve idea');
    },
  });
};
