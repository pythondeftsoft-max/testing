import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessageCountStore } from '@/stores/unreadMessageCountStore';

export const useUnreadMessageCount = () => {
  const unreadCount = useUnreadMessageCountStore((state) => state.unreadCount);
  const loading = useUnreadMessageCountStore((state) => state.loading);
  const fetchUnreadCount = useUnreadMessageCountStore((state) => state.fetchUnreadCount);
  const immediateRefresh = useUnreadMessageCountStore((state) => state.immediateRefresh);

  useEffect(() => {
    console.log('🔔 HOOK: useUnreadMessageCount - useEffect initializing');
    fetchUnreadCount();

    // Set up real-time subscription for ALL message changes
    const channel = supabase
      .channel('message-updates-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('🔔 HOOK: Real-time message change detected:', payload.eventType);
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('🔔 HOOK: Real-time subscription status:', status);
      });

    return () => {
      console.log('🔔 HOOK: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refetch: fetchUnreadCount, immediateRefresh };
};
