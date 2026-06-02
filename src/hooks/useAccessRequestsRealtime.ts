import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAccessRequestsRealtime = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('access-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_requests'
        },
        (payload) => {
          console.log('Access requests change:', payload);
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['access-requests'] });
          
          // If it's for current user, invalidate their specific queries
          const newRequesterId = (payload.new as any)?.requester_id;
          const oldRequesterId = (payload.old as any)?.requester_id;
          
          if (newRequesterId === user.id || oldRequesterId === user.id) {
            queryClient.invalidateQueries({ queryKey: ['access-requests', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};