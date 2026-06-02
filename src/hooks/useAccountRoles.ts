import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAccountRolesContext } from '@/providers/AccountRolesProvider';

// Re-export types for backward compatibility
export type { AccountRoleType } from '@/providers/AccountRolesProvider';
import type { AccountRoleType } from '@/providers/AccountRolesProvider';

// Thin context consumer — all data comes from AccountRolesProvider
export const useAccountRoles = () => {
  return useAccountRolesContext();
};

// Permission interface for granular access control
interface Permission {
  object_name: string;
  display_name: string;
  category: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

// Hook for managing permissions (kept separate — admin-only, not on hot path)
export const usePermissions = () => {
  const { data: permissionObjects, isLoading: objectsLoading } = useQuery({
    queryKey: ['permission-objects'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('permission_objects' as any)
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true });

        if (error) {
          if (error.message?.includes('permission_objects')) return [];
          throw error;
        }
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const getRolePermissions = useCallback(async (roleName: AccountRoleType) => {
    try {
      const { data, error } = await supabase
        .rpc('get_role_permissions' as any, { role_name_param: roleName });
      if (error) {
        if (error.message?.includes('function get_role_permissions')) return [];
        throw error;
      }
      return ((data as any) || []) as Permission[];
    } catch {
      return [];
    }
  }, []);

  const updateRolePermissions = useCallback(async (
    roleName: AccountRoleType,
    objectId: string,
    permissions: { can_view?: boolean; can_edit?: boolean; can_delete?: boolean; can_create?: boolean }
  ) => {
    const { data, error } = await supabase
      .from('role_permissions' as any)
      .upsert({
        role_name: roleName,
        permission_object_id: objectId,
        ...permissions,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return {
    permissionObjects: permissionObjects || [],
    objectsLoading,
    getRolePermissions,
    updateRolePermissions,
  };
};
