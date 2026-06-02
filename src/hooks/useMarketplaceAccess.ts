
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export const useMarketplaceAccess = () => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences(user?.id);

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['marketplace-access', user?.id, preferences?.tenant_marketplace_mode],
    queryFn: async () => {
      if (!user?.id) return false;

      // Let the RPC function determine access based on tenant status

      const { data, error } = await (supabase as any).rpc('should_show_marketplace', {
        p_user_id: user.id,
        p_marketplace_mode: preferences?.tenant_marketplace_mode || 'section8'
      });

      if (error) {
        console.warn('Error checking marketplace access:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    hasMarketplaceAccess: hasAccess || false,
    isLoading
  };
};
