import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TaskWithProgress } from "@/types/implementation";
import { SuggestedTask } from "@/components/implementation/SuggestionCard";

interface GenerateSuggestionsParams {
  existingTasks: TaskWithProgress[];
  type: 'suggest' | 'prioritize';
}

export const useGenerateTaskSuggestions = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ existingTasks, type }: GenerateSuggestionsParams) => {
      const { data, error } = await supabase.functions.invoke('suggest-next-tasks', {
        body: { 
          existingTasks: existingTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            status: t.status,
            estimated_time: t.estimated_time,
            dependencies: t.dependencies,
            completedSubtasks: t.completedSubtasks,
            totalSubtasks: t.totalSubtasks,
          })),
          type 
        }
      });

      if (error) throw error;
      return data.suggestions as SuggestedTask[];
    },
    onError: (error: Error) => {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: "Failed to generate suggestions",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePrioritizeTasks = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (existingTasks: TaskWithProgress[]) => {
      const backlogTasks = existingTasks.filter(t => t.status === 'Backlog');
      
      const { data, error } = await supabase.functions.invoke('suggest-next-tasks', {
        body: { 
          existingTasks: backlogTasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            status: t.status,
            estimated_time: t.estimated_time,
            dependencies: t.dependencies,
            completedSubtasks: t.completedSubtasks,
            totalSubtasks: t.totalSubtasks,
          })),
          type: 'prioritize'
        }
      });

      if (error) throw error;
      return data.suggestions as SuggestedTask[];
    },
    onError: (error: Error) => {
      console.error('Failed to prioritize tasks:', error);
      toast({
        title: "Failed to prioritize tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
