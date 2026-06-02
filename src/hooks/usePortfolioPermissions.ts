
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioRoleType } from './usePortfolioRoles';

export interface PortfolioPermission {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export const usePortfolioPermissions = () => {
  const queryClient = useQueryClient();

  const checkPortfolioPermission = async (
    userId: string,
    portfolioId: string,
    objectName: string,
    action: 'view' | 'edit' | 'delete' | 'create'
  ) => {
    try {
      const { data, error } = await (supabase as any).rpc('has_portfolio_permission', {
        p_user_id: userId,
        p_portfolio_id: portfolioId,
        p_object: objectName,
        p_action: action
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error('Error checking portfolio permission:', error);
      return false;
    }
  };

  const getPortfolioRolePermissions = async (role: PortfolioRoleType) => {
    const { data, error } = await (supabase as any).rpc('get_portfolio_role_permissions', {
      p_role: role
    });

    if (error) throw error;
    return data as PortfolioPermission[];
  };

  const updatePortfolioRolePermissions = useMutation({
    mutationFn: async ({
      role,
      permissions
    }: {
      role: PortfolioRoleType;
      permissions: PortfolioPermission[];
    }) => {
      // Update permissions one by one using portfolio_role_permissions table
      for (const permission of permissions) {
        // Get permission object ID
        const { data: permissionObject } = await supabase
          .from('permission_objects')
          .select('id')
          .eq('name', permission.object_name)
          .eq('scope', 'portfolio')
          .single();

        if (permissionObject) {
          // Upsert permission
          await (supabase as any)
            .from('portfolio_role_permissions')
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
      queryClient.invalidateQueries({ queryKey: ['portfolio-role-permissions'] });
    },
  });

  return {
    checkPortfolioPermission,
    getPortfolioRolePermissions,
    updatePortfolioRolePermissions,
  };
};
