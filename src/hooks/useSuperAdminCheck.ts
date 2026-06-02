import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export const useSuperAdminCheck = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['super-admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      // Check if user is super admin
      const { data, error } = await supabase
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('role_name', 'super_admin')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('Error checking super admin status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
