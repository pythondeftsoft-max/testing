import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserEmail = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user-email', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc('get_user_email', {
        user_id: userId
      });

      if (error) {
        console.error('Error fetching user email:', error);
        return null;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
