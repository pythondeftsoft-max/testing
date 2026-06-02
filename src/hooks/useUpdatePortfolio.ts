import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UpdatePortfolioData {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

export const useUpdatePortfolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_name, client_email, client_phone }: UpdatePortfolioData) => {
      console.log('Updating portfolio:', { id, client_name, client_email, client_phone });
      
      const { data, error } = await supabase
        .from('portfolios')
        .update({
          client_name,
          client_email,
          client_phone,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Portfolio update error:', error);
        throw error;
      }
      
      console.log('Portfolio updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch portfolio queries
      queryClient.invalidateQueries({ queryKey: ['portfolio', data.id] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update portfolio information',
        variant: 'destructive',
      });
    },
  });
};
