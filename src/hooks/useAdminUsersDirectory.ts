import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  user_type: string;
  created_at: string;
  last_sign_in_at: string | null;
  total_points: number;
  account_status: 'active' | 'invited' | 'suspended';
}

export interface UseAdminUsersDirectoryParams {
  searchQuery?: string;
  userTypeFilter?: string;
  statusFilter?: string;
  limit?: number;
  offset?: number;
}

export const useAdminUsersDirectory = (params: UseAdminUsersDirectoryParams = {}) => {
  const {
    searchQuery,
    userTypeFilter,
    statusFilter,
    limit = 50,
    offset = 0
  } = params;

  return useQuery({
    queryKey: ['admin-users-directory', searchQuery, userTypeFilter, statusFilter, limit, offset],
    queryFn: async (): Promise<AdminUser[]> => {
      console.log('🔍 Fetching admin users with params:', {
        searchQuery,
        userTypeFilter,
        statusFilter,
        limit,
        offset
      });

      try {
        const { data, error } = await supabase.rpc('search_admin_users', {
          search_query: searchQuery || null,
          type_filter: userTypeFilter === 'all' ? null : userTypeFilter || null,
          status_filter: statusFilter === 'all' ? null : statusFilter || null,
          limit_count: limit,
          offset_count: offset
        });

        if (error) {
          console.error('❌ Error from search_admin_users RPC:', error);
          console.error('RPC call details:', {
            search_query: searchQuery || null,
            type_filter: userTypeFilter === 'all' ? null : userTypeFilter || null,
            status_filter: statusFilter === 'all' ? null : statusFilter || null,
            limit_count: limit,
            offset_count: offset
          });
          
          // Try fallback to get_admin_user_directory as backup
          console.log('🔄 Attempting fallback to get_admin_user_directory...');
          try {
            const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_admin_user_directory');
            if (!fallbackError && fallbackData) {
              console.log('✅ Fallback successful, returning data from get_admin_user_directory');
              return (fallbackData || []).map((user: any) => ({
                ...user,
                total_points: 0, // No points data available from fallback
                account_status: user.status as 'active' | 'invited' | 'suspended'
              }));
            }
          } catch (fallbackErr) {
            console.error('❌ Fallback also failed:', fallbackErr);
          }
          
          throw error;
        }

        console.log('✅ Successfully fetched admin users:', data?.length || 0, 'users');
        
        const mappedData = (data || []).map(user => ({
          ...user,
          phone: (user as any).phone,
          total_points: Number((user as any).total_points ?? 0),
          account_status: user.account_status as 'active' | 'invited' | 'suspended'
        }));

        console.log('📊 Sample user data:', mappedData[0]);
        return mappedData;

      } catch (err) {
        console.error('❌ Unexpected error in useAdminUsersDirectory:', err);
        throw err;
      }
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
};

export const useAdminUserCounts = () => {
  return useQuery({
    queryKey: ['admin-users-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_admin_users', {
        search_query: null,
        type_filter: null,
        status_filter: null,
        limit_count: 1000,
        offset_count: 0
      });

      if (error) throw error;

      const users = data || [];
      
      return {
        total: users.length,
        active: users.filter(u => u.account_status === 'active').length,
        invited: users.filter(u => u.account_status === 'invited').length,
        suspended: users.filter(u => u.account_status === 'suspended').length,
        byType: users.reduce((acc, user) => {
          acc[user.user_type] = (acc[user.user_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    },
    staleTime: 60000, // 1 minute
  });
};