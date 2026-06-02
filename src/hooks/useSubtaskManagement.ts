import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Subtask } from '@/types/implementation';

export const useToggleSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtasks,
      subtaskId,
    }: {
      taskId: string;
      subtasks: Subtask[];
      subtaskId: string;
    }) => {
      const updatedSubtasks = subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );

      const { error } = await supabase
        .from('implementation_tasks')
        .update({ subtasks: updatedSubtasks as any })
        .eq('id', taskId);

      if (error) throw error;

      return updatedSubtasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementation-tasks'] });
    },
    onError: (error) => {
      console.error('Error toggling subtask:', error);
      toast.error('Failed to update subtask');
    },
  });
};

export const useAddSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtasks,
      title,
    }: {
      taskId: string;
      subtasks: Subtask[];
      title: string;
    }) => {
      const newSubtask: Subtask = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        order: subtasks.length + 1,
      };

      const updatedSubtasks = [...subtasks, newSubtask];

      const { error } = await supabase
        .from('implementation_tasks')
        .update({ subtasks: updatedSubtasks as any })
        .eq('id', taskId);

      if (error) throw error;

      return updatedSubtasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementation-tasks'] });
      toast.success('Subtask added');
    },
    onError: (error) => {
      console.error('Error adding subtask:', error);
      toast.error('Failed to add subtask');
    },
  });
};
