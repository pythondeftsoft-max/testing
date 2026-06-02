import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

export interface ActiveGrant {
  scope: 'account' | 'portfolio';
  portfolio_id: string | null;
  object_name: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  expires_at: string;
}

export const useActiveGrants = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const portfolioId = searchParams.get('portfolioId');

  return useQuery<ActiveGrant[]>({
    queryKey: ['active-grants', user?.id, portfolioId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any).rpc('get_user_active_grants', {
        p_user_id: user.id,
        p_portfolio_id: portfolioId === 'everything' ? null : portfolioId
      });

      if (error) {
        console.error('Error fetching active grants:', error);
        return [];
      }

      return data as ActiveGrant[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
};