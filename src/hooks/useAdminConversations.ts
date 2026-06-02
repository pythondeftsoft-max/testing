import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];
type PropertyApplication = Database['public']['Tables']['property_applications']['Row'];

export interface ConversationDetail {
  application_id: string;
  property_id: string;
  property_address: string;
  tenant_id: string;
  tenant_email: string;
  tenant_first_name: string;
  tenant_last_name: string;
  landlord_id: string;
  landlord_email: string;
  landlord_first_name: string;
  landlord_last_name: string;
  message_count: number;
  flagged_count: number;
  last_message_at: string;
  last_message_text: string;
  unread_by_landlord: number;
  unread_by_tenant: number;
  status: string;
}

export interface ConversationFilters {
  status: string;
  hasUnread: string;
  messageVolume: string;
  timeRange: string;
  flaggedStatus: string;
  searchQuery: string;
  sortBy: string;
}

export const useAdminConversations = (
  filters?: ConversationFilters
) => {
  return useQuery({
    queryKey: ['admin-conversations', filters],
    queryFn: async () => {
      // Get all four application types including property_pushes
      const [propertyApps, marketplaceApps, unitApps, pushApps] = await Promise.all([
        supabase
          .from('property_applications')
          .select(`
            id,
            status,
            tenant_id,
            property_id,
            properties (
              id,
              address,
              owner_id
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('marketplace_applications')
          .select(`
            id,
            status,
            user_id,
            property_id,
            properties (
              id,
              address,
              owner_id
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('unit_applications')
          .select(`
            id,
            status,
            tenant_id,
            unit_id,
            property_units (
              id,
              unit_number,
              property_id,
              properties (
                id,
                address,
                owner_id
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('property_pushes')
          .select(`
            id,
            status,
            tenant_id,
            property_id,
            properties!fk_property_pushes_property_id (
              id,
              address,
              owner_id
            )
          `)
          .order('created_at', { ascending: false })
      ]);

      if (propertyApps.error) throw propertyApps.error;
      if (marketplaceApps.error) throw marketplaceApps.error;
      if (unitApps.error) throw unitApps.error;
      if (pushApps.error) throw pushApps.error;

      // Normalize applications to a common structure
      const allApplications = [
        ...(propertyApps.data || []).map(app => ({
          id: app.id,
          type: 'property' as const,
          status: app.status,
          tenant_id: app.tenant_id,
          property_id: app.property_id,
          property_address: app.properties?.address || 'Unknown Address',
          owner_id: app.properties?.owner_id || ''
        })),
        ...(marketplaceApps.data || []).map(app => ({
          id: app.id,
          type: 'marketplace' as const,
          status: app.status,
          tenant_id: app.user_id,
          property_id: app.property_id,
          property_address: app.properties?.address || 'Unknown Address',
          owner_id: app.properties?.owner_id || ''
        })),
        ...(unitApps.data || []).map(app => ({
          id: app.id,
          type: 'unit' as const,
          status: app.status,
          tenant_id: app.tenant_id,
          property_id: app.property_units?.property_id || '',
          property_address: `${app.property_units?.properties?.address || 'Unknown Address'} - Unit ${app.property_units?.unit_number || ''}`,
          owner_id: app.property_units?.properties?.owner_id || ''
        })),
        ...(pushApps.data || []).map(app => ({
          id: app.id,
          type: 'push' as const,
          status: app.status,
          tenant_id: app.tenant_id,
          property_id: app.property_id,
          property_address: app.properties?.address || 'Unknown Address',
          owner_id: app.properties?.owner_id || ''
        }))
      ];

      if (allApplications.length === 0) return [];

      // Build message query to include property_push_id
      const propertyAppIds = propertyApps.data?.map(a => a.id) || [];
      const marketplaceAppIds = marketplaceApps.data?.map(a => a.id) || [];
      const unitAppIds = unitApps.data?.map(a => a.id) || [];
      const pushAppIds = pushApps.data?.map(a => a.id) || [];

      // Build OR filter for messages
      const orFilters: string[] = [];
      if (propertyAppIds.length > 0) {
        orFilters.push(`property_application_id.in.(${propertyAppIds.join(',')})`);
      }
      if (marketplaceAppIds.length > 0) {
        orFilters.push(`marketplace_application_id.in.(${marketplaceAppIds.join(',')})`);
      }
      if (unitAppIds.length > 0) {
        orFilters.push(`unit_application_id.in.(${unitAppIds.join(',')})`);
      }
      if (pushAppIds.length > 0) {
        orFilters.push(`property_push_id.in.(${pushAppIds.join(',')})`);
      }

      if (orFilters.length === 0) return [];

      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(orFilters.join(','))
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Get unique user IDs
      const userIds = new Set<string>();
      allApplications.forEach(app => {
        userIds.add(app.tenant_id);
        if (app.owner_id) {
          userIds.add(app.owner_id);
        }
      });

      // Get profile details
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', Array.from(userIds));

      if (profileError) throw profileError;

      // Create profile lookup map
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build conversation details
      let conversations: ConversationDetail[] = allApplications
        .map(app => {
          const appMessages = messages?.filter(m => {
            if (app.type === 'property') return m.property_application_id === app.id;
            if (app.type === 'marketplace') return m.marketplace_application_id === app.id;
            if (app.type === 'unit') return m.unit_application_id === app.id;
            if (app.type === 'push') return m.property_push_id === app.id;
            return false;
          }) || [];
          
          if (appMessages.length === 0) return null;

          const tenant = profileMap.get(app.tenant_id);
          const landlord = app.owner_id ? profileMap.get(app.owner_id) : null;
          const flaggedCount = appMessages.filter(m => m.is_flagged).length;
          const lastMessage = appMessages[0];

          return {
            application_id: app.id,
            property_id: app.property_id,
            property_address: app.property_address,
            tenant_id: app.tenant_id,
            tenant_email: tenant?.email || '',
            tenant_first_name: tenant?.first_name || '',
            tenant_last_name: tenant?.last_name || '',
            landlord_id: app.owner_id,
            landlord_email: landlord?.email || '',
            landlord_first_name: landlord?.first_name || '',
            landlord_last_name: landlord?.last_name || '',
            message_count: appMessages.length,
            flagged_count: flaggedCount,
            last_message_at: lastMessage.created_at,
            last_message_text: lastMessage.message_text,
            unread_by_landlord: appMessages.filter(m => m.created_by_tenant && !m.read_by_landlord).length,
            unread_by_tenant: appMessages.filter(m => !m.created_by_tenant && !m.read_by_tenant).length,
            status: app.status
          };
        })
        .filter((conv): conv is ConversationDetail => conv !== null);

      // Apply filters
      if (filters) {
        // Status filter
        if (filters.status !== 'all') {
          conversations = conversations.filter(c => c.status === filters.status);
        }

        // Flagged status filter
        if (filters.flaggedStatus === 'clean') {
          conversations = conversations.filter(c => c.flagged_count === 0);
        } else if (filters.flaggedStatus === 'flagged') {
          conversations = conversations.filter(c => c.flagged_count > 0);
        }

        // Unread filter
        if (filters.hasUnread === 'landlord') {
          conversations = conversations.filter(c => c.unread_by_landlord > 0);
        } else if (filters.hasUnread === 'tenant') {
          conversations = conversations.filter(c => c.unread_by_tenant > 0);
        } else if (filters.hasUnread === 'none') {
          conversations = conversations.filter(c => c.unread_by_landlord === 0 && c.unread_by_tenant === 0);
        }

        // Message volume filter
        if (filters.messageVolume === 'high') {
          conversations = conversations.filter(c => c.message_count > 10);
        } else if (filters.messageVolume === 'medium') {
          conversations = conversations.filter(c => c.message_count >= 5 && c.message_count <= 10);
        } else if (filters.messageVolume === 'low') {
          conversations = conversations.filter(c => c.message_count < 5);
        }

        // Time range filter
        if (filters.timeRange !== 'all') {
          const now = new Date();
          let cutoffDate: Date;
          
          if (filters.timeRange === '24h') {
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          } else if (filters.timeRange === '7d') {
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          } else if (filters.timeRange === '30d') {
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          } else {
            cutoffDate = new Date(0);
          }
          
          conversations = conversations.filter(c => new Date(c.last_message_at) >= cutoffDate);
        }

        // Search filter
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          conversations = conversations.filter(c => 
            c.tenant_first_name.toLowerCase().includes(query) ||
            c.tenant_last_name.toLowerCase().includes(query) ||
            c.landlord_first_name.toLowerCase().includes(query) ||
            c.landlord_last_name.toLowerCase().includes(query) ||
            c.property_address.toLowerCase().includes(query) ||
            c.last_message_text.toLowerCase().includes(query)
          );
        }

        // Apply sorting
        if (filters.sortBy === 'oldest') {
          conversations.sort((a, b) => new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime());
        } else if (filters.sortBy === 'messages') {
          conversations.sort((a, b) => b.message_count - a.message_count);
        } else if (filters.sortBy === 'flagged') {
          conversations.sort((a, b) => b.flagged_count - a.flagged_count);
        } else if (filters.sortBy === 'unread') {
          conversations.sort((a, b) => (b.unread_by_landlord + b.unread_by_tenant) - (a.unread_by_landlord + a.unread_by_tenant));
        } else {
          // Default: most recent
          conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        }
      }

      return conversations;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};
