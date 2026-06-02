import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// OpenKey Housing system messages use this admin ID as sender
const OPENKEY_HOUSING_ADMIN_ID = '926ac02b-ba75-4219-9a54-95ceaf658492';

interface LandlordUnreadMessageCountState {
  unreadCount: number;
  loading: boolean;
  fetchUnreadCount: () => Promise<void>;
  immediateRefresh: () => Promise<void>;
}

export const useLandlordUnreadMessageCountStore = create<LandlordUnreadMessageCountState>((set) => ({
  unreadCount: 0,
  loading: true,

  fetchUnreadCount: async () => {
    console.log('🔔 LANDLORD STORE: Starting fetchUnreadCount');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔔 LANDLORD STORE: No user found, setting count to 0');
        set({ unreadCount: 0, loading: false });
        return;
      }

      // Get all properties owned by the current landlord
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);

      if (propsError) throw propsError;

      if (!properties || properties.length === 0) {
        console.log('🔔 LANDLORD STORE: No properties found, setting count to 0');
        set({ unreadCount: 0, loading: false });
        return;
      }

      const propertyIds = properties.map(prop => prop.id);

      // Get property applications for housed/lease_signed tenants only
      const { data: applications, error: appError } = await supabase
        .from('property_applications')
        .select('id')
        .in('property_id', propertyIds)
        .in('status', ['lease_signed', 'housed']);

      if (appError) throw appError;

      const applicationIds = applications?.map(app => app.id) || [];

      // Also get property pushes for admin-driven matches
      const { data: propertyPushes, error: pushError } = await supabase
        .from('property_pushes')
        .select('id')
        .in('property_id', propertyIds);

      if (pushError) throw pushError;

      const pushIds = propertyPushes?.map(push => push.id) || [];

      // If no applications and no pushes, no messages to count
      if (applicationIds.length === 0 && pushIds.length === 0) {
        console.log('🔔 LANDLORD STORE: No applications or pushes found, setting count to 0');
        set({ unreadCount: 0, loading: false });
        return;
      }

      // Count unread messages from property applications (tenant messages + OpenKey Housing messages)
      let appCount = 0;
      if (applicationIds.length > 0) {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('property_application_id', applicationIds)
          .or(`created_by_tenant.eq.true,sender_id.eq.${OPENKEY_HOUSING_ADMIN_ID}`)
          .eq('read_by_landlord', false);

        if (error) throw error;
        appCount = count || 0;
      }

      // Count unread messages from property pushes (tenant messages + OpenKey Housing messages)
      let pushCount = 0;
      if (pushIds.length > 0) {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('property_push_id', pushIds)
          .or(`created_by_tenant.eq.true,sender_id.eq.${OPENKEY_HOUSING_ADMIN_ID}`)
          .eq('read_by_landlord', false);

        if (error) throw error;
        pushCount = count || 0;
      }

      const totalUnread = appCount + pushCount;
      console.log('🔔 LANDLORD STORE: Total unread count:', totalUnread);

      set({ unreadCount: totalUnread, loading: false });
    } catch (error) {
      console.error('🔔 LANDLORD STORE: Exception in fetchUnreadCount:', error);
      set({ unreadCount: 0, loading: false });
    }
  },

  immediateRefresh: async () => {
    console.log('🔔 LANDLORD STORE: Manual immediate refresh triggered');
    const state = useLandlordUnreadMessageCountStore.getState();
    await state.fetchUnreadCount();
    
    // Delayed secondary refresh for safety
    setTimeout(async () => {
      console.log('🔔 LANDLORD STORE: Delayed secondary refresh');
      await useLandlordUnreadMessageCountStore.getState().fetchUnreadCount();
    }, 1000);
  },
}));
