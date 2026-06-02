import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLandlordUnreadMessageCountStore } from '@/stores/landlordUnreadMessageCountStore';

export const useLandlordUnreadMessageCount = () => {
  // Use individual selectors for reactive state values only
  const unreadCount = useLandlordUnreadMessageCountStore((state) => state.unreadCount);
  const loading = useLandlordUnreadMessageCountStore((state) => state.loading);

  useEffect(() => {
    console.log('🔔 LANDLORD HOOK: Setting up real-time subscriptions');
    
    // Access via getState() for stable reference
    useLandlordUnreadMessageCountStore.getState().fetchUnreadCount();

    // Set up real-time subscriptions for landlord-relevant message changes
    const updateChannel = supabase
      .channel('landlord-message-reads')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'read_by_landlord=eq.true'
        },
        (payload) => {
          console.log('🔔 LANDLORD HOOK: Message read status UPDATE detected:', payload);
          useLandlordUnreadMessageCountStore.getState().fetchUnreadCount();
        }
      )
      .subscribe();

    const insertChannel = supabase
      .channel('landlord-new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'created_by_tenant=eq.true'
        },
        (payload) => {
          console.log('🔔 LANDLORD HOOK: New tenant message INSERT detected:', payload);
          useLandlordUnreadMessageCountStore.getState().fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 LANDLORD HOOK: Cleaning up real-time subscriptions');
      supabase.removeChannel(updateChannel);
      supabase.removeChannel(insertChannel);
    };
  }, []); // Empty dependency array - stable effect

  return { 
    unreadCount, 
    loading, 
    refetch: () => useLandlordUnreadMessageCountStore.getState().fetchUnreadCount(), 
    immediateRefresh: () => useLandlordUnreadMessageCountStore.getState().immediateRefresh() 
  };
};
