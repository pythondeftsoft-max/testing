import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IMPLEMENTATION_KEYS } from '@/lib/queryKeys';
import { toast } from 'sonner';

export const useBulkImportTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('bulk-import-tasks', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: IMPLEMENTATION_KEYS.all });
      toast.success(`Successfully imported ${data.tasksImported} tasks`);
    },
    onError: (error) => {
      console.error('Error importing tasks:', error);
      toast.error('Failed to import tasks');
    },
  });
};
