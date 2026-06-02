import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useActiveGrantsRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('access-grants-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_grants'
        },
        (payload) => {
          console.log('Access grants change:', payload);
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['active-grants'] });
          
          // If it's for current user, invalidate all their specific queries  
          const newUserId = (payload.new as any)?.user_id;
          const oldUserId = (payload.old as any)?.user_id;
          
          if (newUserId === user.id || oldUserId === user.id) {
            queryClient.invalidateQueries({ queryKey: ['active-grants', user.id] });
            queryClient.invalidateQueries({ queryKey: ['access-grants'] });
            // Also invalidate any portfolio-specific keys
            const portfolioId = (payload.new as any)?.portfolio_id || (payload.old as any)?.portfolio_id;
            if (portfolioId) {
              queryClient.invalidateQueries({ queryKey: ['active-grants', user.id, portfolioId] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};