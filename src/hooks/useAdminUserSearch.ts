import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  user_type: string;
  created_at: string;
  total_points?: number;
}

export const useAdminUserSearch = (searchQuery: string) => {
  return useQuery({
    queryKey: ['admin-user-search', searchQuery],
    queryFn: async (): Promise<AdminUserSearchResult[]> => {
      if (!searchQuery || searchQuery.length < 2) {
        return [];
      }

      // Use unified admin search RPC to include email and total_points
      const { data, error } = await supabase.rpc('search_admin_users', {
        search_query: searchQuery,
        type_filter: null,
        status_filter: null,
        limit_count: 10,
        offset_count: 0,
      });

      if (error) throw error;

      const results = (data || []).map((u: any) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone || null,
        user_type: u.user_type,
        created_at: u.created_at,
        total_points: Number(u.total_points ?? 0),
      }));

      return results;
    },
    enabled: searchQuery.length >= 2,
  });
};