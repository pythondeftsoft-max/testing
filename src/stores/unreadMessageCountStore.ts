import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UnreadMessageCountState {
  unreadCount: number;
  loading: boolean;
  fetchUnreadCount: () => Promise<void>;
  immediateRefresh: () => Promise<void>;
  _channel: RealtimeChannel | null;
  _refetchTimer: ReturnType<typeof setTimeout> | null;
  _initRealtime: () => void;
}

export const useUnreadMessageCountStore = create<UnreadMessageCountState>((set, get) => ({
  unreadCount: 0,
  loading: true,
  _channel: null,
  _refetchTimer: null,

  _initRealtime: () => {
    if (get()._channel) return; // already subscribed

    console.log('🔔 STORE: Initializing global messages realtime subscription');
    const channel = supabase
      .channel('unread-messages-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('🔔 STORE: Realtime message change:', payload.eventType);
          // Debounce — collapse bursts of inserts/updates into one refetch
          const existing = get()._refetchTimer;
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            get().fetchUnreadCount();
          }, 500);
          set({ _refetchTimer: timer });
        }
      )
      .subscribe((status) => {
        console.log('🔔 STORE: Realtime subscription status:', status);
      });

    set({ _channel: channel });
  },

  fetchUnreadCount: async () => {
    console.log('🔔 STORE: Starting fetchUnreadCount');

    // Lazy-init realtime on first fetch so the badge stays live
    get()._initRealtime();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔔 STORE: No user found, setting count to 0');
        set({ unreadCount: 0, loading: false });
        return;
      }

      // Fetch property_applications, marketplace_applications, AND property_pushes
      const [propertyAppsResult, marketplaceAppsResult, propertyPushesResult] = await Promise.all([
        supabase
          .from('property_applications')
          .select('id')
          .eq('tenant_id', user.id),
        supabase
          .from('marketplace_applications')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('property_pushes')
          .select('id')
          .eq('tenant_id', user.id)
      ]);

      if (propertyAppsResult.error) throw propertyAppsResult.error;
      if (marketplaceAppsResult.error) throw marketplaceAppsResult.error;
      if (propertyPushesResult.error) throw propertyPushesResult.error;

      const propertyAppIds = (propertyAppsResult.data || []).map(app => app.id);
      const marketplaceAppIds = (marketplaceAppsResult.data || []).map(app => app.id);
      const propertyPushIds = (propertyPushesResult.data || []).map(push => push.id);

      if (propertyAppIds.length === 0 && marketplaceAppIds.length === 0 && propertyPushIds.length === 0) {
        console.log('🔔 STORE: No applications or pushes found, setting count to 0');
        set({ unreadCount: 0, loading: false });
        return;
      }

      // Build queries for all application types
      const queries = [];

      if (propertyAppIds.length > 0) {
        queries.push(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: false })
            .in('property_application_id', propertyAppIds)
            .eq('created_by_tenant', false)
            .eq('read_by_tenant', false)
        );
      } else {
        queries.push(Promise.resolve({ count: 0, data: [], error: null }));
      }

      if (marketplaceAppIds.length > 0) {
        queries.push(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: false })
            .in('marketplace_application_id', marketplaceAppIds)
            .eq('created_by_tenant', false)
            .eq('read_by_tenant', false)
        );
      } else {
        queries.push(Promise.resolve({ count: 0, data: [], error: null }));
      }

      if (propertyPushIds.length > 0) {
        queries.push(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: false })
            .in('property_push_id', propertyPushIds)
            .eq('created_by_tenant', false)
            .eq('read_by_tenant', false)
        );
      } else {
        queries.push(Promise.resolve({ count: 0, data: [], error: null }));
      }

      const [propertyMessagesResult, marketplaceMessagesResult, pushMessagesResult] = await Promise.all(queries);

      if (propertyMessagesResult.error) throw propertyMessagesResult.error;
      if (marketplaceMessagesResult.error) throw marketplaceMessagesResult.error;
      if (pushMessagesResult.error) throw pushMessagesResult.error;

      const propertyCount = propertyMessagesResult.count || 0;
      const marketplaceCount = marketplaceMessagesResult.count || 0;
      const pushCount = pushMessagesResult.count || 0;
      const totalCount = propertyCount + marketplaceCount + pushCount;

      console.log('🔔 STORE: Total unread count:', totalCount);

      set({ unreadCount: totalCount, loading: false });
    } catch (error) {
      console.error('🔔 STORE: Exception in fetchUnreadCount:', error);
      set({ unreadCount: 0, loading: false });
    }
  },

  immediateRefresh: async () => {
    console.log('🔔 STORE: Manual immediate refresh triggered');
    const state = useUnreadMessageCountStore.getState();
    await state.fetchUnreadCount();
  },
}));
