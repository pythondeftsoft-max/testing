import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUserDirectoryUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  user_type: string;
  account_status: string;
  created_at: string;
  total_points?: number;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_role?: string;
}

export interface UseAdminUserDirectoryParams {
  searchQuery?: string;
  userTypeFilter?: string;
  statusFilter?: string;
  limit?: number;
  offset?: number;
}

export const useAdminUserDirectory = (params: UseAdminUserDirectoryParams = {}) => {
  const {
    searchQuery = '',
    userTypeFilter,
    statusFilter,
    limit = 50,
    offset = 0,
  } = params;

  return useQuery({
    queryKey: ['admin-user-directory', searchQuery, userTypeFilter, statusFilter, limit, offset],
    queryFn: async (): Promise<AdminUserDirectoryUser[]> => {
      // Use the existing admin search RPC which includes subscription data
      const { data, error } = await supabase.rpc('search_admin_users', {
        search_query: searchQuery || '',
        type_filter: userTypeFilter || null,
        status_filter: statusFilter || null,
        limit_count: limit,
        offset_count: offset,
      });

      if (error) throw error;

      return (data || []).map((user: any) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        account_status: user.account_status,
        created_at: user.created_at,
        total_points: Number(user.total_points ?? 0),
        subscription_status: user.subscription_status,
        subscription_plan: user.subscription_plan,
        subscription_role: user.subscription_role,
      }));
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useAdminUserCounts = () => {
  return useQuery({
    queryKey: ['admin-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_admin_users', {
        search_query: '',
        type_filter: null,
        status_filter: null,
        limit_count: 1000,
        offset_count: 0,
      });

      if (error) throw error;

      const users = data || [];
      
      return {
        total: users.length,
        active: users.filter((u: any) => u.account_status === 'active').length,
        invited: users.filter((u: any) => u.account_status === 'invited').length,
        suspended: users.filter((u: any) => u.account_status === 'suspended').length,
        by_type: {
          tenant: users.filter((u: any) => u.user_type === 'tenant').length,
          landlord: users.filter((u: any) => u.user_type === 'landlord').length,
          admin: users.filter((u: any) => u.user_type === 'admin').length,
        },
      };
    },
    staleTime: 60000, // 1 minute
  });
};