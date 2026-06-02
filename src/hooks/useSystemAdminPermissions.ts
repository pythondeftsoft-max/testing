import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SystemAdminRoleType = 'super_admin' | 'operations_admin' | 'matchmaker';

export interface SystemAdminPermission {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export const useSystemAdminPermissions = () => {
  const queryClient = useQueryClient();

  const useGetSystemAdminRolePermissions = (role: SystemAdminRoleType) => {
    return useQuery({
      queryKey: ['system-admin-role-permissions', role],
      queryFn: async () => {
        const { data, error } = await (supabase as any).rpc('get_system_admin_role_permissions', {
          p_role: role
        });

        if (error) throw error;
        return data as SystemAdminPermission[];
      },
      enabled: !!role,
    });
  };

  const updateSystemAdminRolePermissions = useMutation({
    mutationFn: async ({
      role,
      permissions
    }: {
      role: SystemAdminRoleType;
      permissions: SystemAdminPermission[];
    }) => {
      // Update permissions one by one using system_admin_permissions table
      for (const permission of permissions) {
        // Get permission object ID
        const { data: permissionObject } = await supabase
          .from('permission_objects')
          .select('id')
          .eq('name', permission.object_name)
          .eq('scope', 'system')
          .single();

        if (permissionObject) {
          // Upsert permission
          const { error } = await supabase
            .from('system_admin_permissions')
            .upsert({
              role_name: role,
              permission_object_id: permissionObject.id,
              can_view: permission.can_view,
              can_edit: permission.can_edit,
              can_delete: permission.can_delete,
              can_create: permission.can_create,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-admin-role-permissions', variables.role] });
      toast.success('System admin role permissions updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });

  return {
    useGetSystemAdminRolePermissions,
    updateSystemAdminRolePermissions,
  };
};
