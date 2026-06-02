
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminRbacRequest {
  action: string;
  data: any;
}

interface GrantPortfolioRoleData {
  portfolioId: string;
  targetUserId: string;
  role: 'admin_partner' | 'editor' | 'viewer' | 'maintenance';
  roleTag?: string;
}

interface RevokePortfolioRoleData {
  portfolioRoleId: string;
}

interface UpdatePortfolioRoleData {
  portfolioRoleId: string;
  updates: {
    role_name?: 'admin_partner' | 'editor' | 'viewer' | 'maintenance';
    role_tag?: string;
  };
}

interface BulkRoleOperationData {
  operation: 'grant' | 'revoke' | 'update';
  targets: any[];
}

interface SimulatePermissionsData {
  userId: string;
  portfolioId: string;
  permissionChecks: Array<{
    object: string;
    action: 'view' | 'edit' | 'delete' | 'create';
  }>;
}

export const useAdminRbac = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const callAdminRbacFunction = async (request: AdminRbacRequest) => {
    const { data, error } = await supabase.functions.invoke('admin-rbac', {
      body: request,
    });

    if (error) throw error;
    return data;
  };

  // Grant portfolio role
  const grantPortfolioRole = useMutation({
    mutationFn: async (data: GrantPortfolioRoleData) => {
      return callAdminRbacFunction({
        action: 'grant_portfolio_role',
        data: {
          portfolio_id: data.portfolioId,
          user_id: data.targetUserId,
          role_name: data.role,
          added_by: (await supabase.auth.getUser()).data.user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roles'] });
      toast({
        title: "Role Granted",
        description: "Portfolio role has been successfully granted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Grant Role",
        description: error.message || "An error occurred while granting the role.",
        variant: "destructive",
      });
    },
  });

  // Revoke portfolio role
  const revokePortfolioRole = useMutation({
    mutationFn: async (data: { portfolioId: string; targetUserId: string }) => {
      return callAdminRbacFunction({
        action: 'revoke_portfolio_role',
        data: {
          portfolio_id: data.portfolioId,
          user_id: data.targetUserId,
          revoked_by: (await supabase.auth.getUser()).data.user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roles'] });
      toast({
        title: "Role Revoked",
        description: "Portfolio role has been successfully revoked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Revoke Role",
        description: error.message || "An error occurred while revoking the role.",
        variant: "destructive",
      });
    },
  });

  // Update portfolio role
  const updatePortfolioRole = useMutation({
    mutationFn: async (data: { portfolioId: string; targetUserId: string; newRole: string }) => {
      return callAdminRbacFunction({
        action: 'update_portfolio_role',
        data: {
          portfolio_id: data.portfolioId,
          user_id: data.targetUserId,
          new_role_name: data.newRole,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roles'] });
      toast({
        title: "Role Updated",
        description: "Portfolio role has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Role",
        description: error.message || "An error occurred while updating the role.",
        variant: "destructive",
      });
    },
  });

  // Bulk operations
  const bulkRoleOperation = useMutation({
    mutationFn: async (data: BulkRoleOperationData) => {
      return callAdminRbacFunction({
        action: 'bulk_role_operation',
        data,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-roles'] });
      
      const { results } = result;
      const successCount = results.filter((r: any) => r.success).length;
      const failureCount = results.length - successCount;
      
      toast({
        title: "Bulk Operation Complete",
        description: `${successCount} operations succeeded${failureCount > 0 ? `, ${failureCount} failed` : ''}.`,
        variant: failureCount > 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Operation Failed",
        description: error.message || "An error occurred during bulk operation.",
        variant: "destructive",
      });
    },
  });

  // Get user portfolio access
  const useUserPortfolioAccess = (userId: string) => {
    return useQuery({
      queryKey: ['user-portfolio-access', userId],
      queryFn: async () => {
        return callAdminRbacFunction({
          action: 'get_user_portfolio_access',
          data: { userId },
        });
      },
      enabled: !!userId,
    });
  };

  // Simulate user permissions
  const simulateUserPermissions = useMutation({
    mutationFn: async (data: SimulatePermissionsData) => {
      return callAdminRbacFunction({
        action: 'simulate_permissions',
        data: {
          user_id: data.userId,
          portfolio_id: data.portfolioId,
          permissions_to_check: data.permissionChecks,
        },
      });
    },
  });

  return {
    grantPortfolioRole,
    revokePortfolioRole,
    updatePortfolioRole,
    bulkRoleOperation,
    useUserPortfolioAccess,
    simulateUserPermissions,
  };
};
