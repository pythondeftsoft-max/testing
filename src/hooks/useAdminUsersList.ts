import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  has_conversation: boolean;
}

export type UserFilter = 'all' | 'active' | 'unread';

export const useAdminUsersList = (searchQuery?: string, filter: UserFilter = 'all') => {
  return useQuery({
    queryKey: ['admin-users-list', searchQuery, filter],
    queryFn: async () => {
      // Get all profiles
      let profilesQuery = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, user_type');

      // Apply search filter if provided
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        profilesQuery = profilesQuery.or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
        );
      }

      const { data: profiles, error: profileError } = await profilesQuery;

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      // Get all admin messages for these users
      const userIds = profiles.map(p => p.id);
      const { data: messages, error: msgError } = await supabase
        .from('admin_messages')
        .select('*')
        .in('recipient_user_id', userIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Build conversation data map
      const conversationMap = new Map<string, {
        last_message: string;
        last_message_at: string;
        unread_count: number;
      }>();

      messages?.forEach(msg => {
        const userId = msg.recipient_user_id;
        
        if (!conversationMap.has(userId)) {
          const unreadCount = messages.filter(
            m => m.recipient_user_id === userId && !m.read
          ).length;

          conversationMap.set(userId, {
            last_message: msg.message_text.substring(0, 100),
            last_message_at: msg.created_at,
            unread_count: unreadCount,
          });
        }
      });

      // Map profiles to AdminUser format
      const users: AdminUser[] = profiles.map(profile => {
        const conversation = conversationMap.get(profile.id);
        return {
          user_id: profile.id,
          email: profile.email || '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          user_type: profile.user_type || 'tenant',
          last_message: conversation?.last_message || null,
          last_message_at: conversation?.last_message_at || null,
          unread_count: conversation?.unread_count || 0,
          has_conversation: !!conversation,
        };
      });

      // Sort users:
      // 1. Users with unread messages first
      // 2. Then users with conversations (by last message date)
      // 3. Then users without conversations (alphabetically)
      users.sort((a, b) => {
        // Unread messages first
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        
        // Both have unread or both don't have unread
        if (a.has_conversation && b.has_conversation) {
          // Sort by last message date
          return new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime();
        }
        
        // One has conversation, one doesn't
        if (a.has_conversation && !b.has_conversation) return -1;
        if (!a.has_conversation && b.has_conversation) return 1;
        
        // Both don't have conversations - sort alphabetically
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Apply filter
      let filteredUsers = users;
      if (filter === 'active') {
        filteredUsers = users.filter(u => u.has_conversation);
      } else if (filter === 'unread') {
        filteredUsers = users.filter(u => u.unread_count > 0);
      }

      return filteredUsers;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};
