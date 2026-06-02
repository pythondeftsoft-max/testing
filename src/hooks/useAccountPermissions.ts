import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AccountRoleType } from '@/hooks/useAccountRoles';

export interface AccountPermission {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export const useAccountPermissions = () => {
  const queryClient = useQueryClient();

  const checkAccountPermission = async (
    userId: string,
    objectName: string,
    action: 'view' | 'edit' | 'delete' | 'create'
  ) => {
    try {
      const { data, error } = await (supabase as any).rpc('has_account_permission', {
        p_user_id: userId,
        p_object: objectName,
        p_action: action
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error('Error checking account permission:', error);
      return false;
    }
  };

  const getAccountRolePermissions = async (role: AccountRoleType) => {
    const { data, error } = await (supabase as any).rpc('get_account_role_permissions', {
      p_role: role
    });

    if (error) throw error;
    return data as AccountPermission[];
  };

  const updateAccountRolePermissions = useMutation<void, Error, { role: AccountRoleType; permissions: AccountPermission[] }>({
    mutationFn: async ({
      role,
      permissions
    }) => {
      // Update permissions one by one using account_role_permissions table
      for (const permission of permissions) {
        // Get permission object ID
        const { data: permissionObject } = await (supabase as any)
          .from('permission_objects')
          .select('id')
          .eq('name', permission.object_name)
          .eq('scope', 'account')
          .single();

        if (permissionObject) {
          // Upsert permission in account_role_permissions table
          await (supabase as any)
            .from('account_role_permissions')
            .upsert({
              role_name: role,
              permission_object_id: permissionObject.id,
              can_view: permission.can_view,
              can_edit: permission.can_edit,
              can_delete: permission.can_delete,
              can_create: permission.can_create,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-role-permissions'] });
    },
  });

  return {
    checkAccountPermission,
    getAccountRolePermissions,
    updateAccountRolePermissions,
  };
};