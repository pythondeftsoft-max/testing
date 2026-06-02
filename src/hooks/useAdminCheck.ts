
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export const useAdminCheck = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await (supabase as any).rpc('is_admin', { user_id: user.id });
      if (error) console.warn('Error checking admin status:', error);

      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};
