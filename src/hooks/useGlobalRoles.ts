
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GlobalPortfolio {
  portfolio_id: string;
  portfolio_name: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  created_at: string;
  property_count: number;
  role_count: number;
  roles: Array<{
    portfolio_role_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    role_name: string;
    is_active: boolean;
    added_by: string;
    updated_at: string;
  }>;
}

export interface GlobalUser {
  user_id: string;
  user_name: string;
  user_email: string;
  user_type: string;
  account_roles: string[];
  portfolio_count: number;
  created_at: string;
  last_sign_in_at: string;
}

export const useGlobalRoles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all users with their roles - admin only
  const useAllUsersWithRoles = () => {
    return useQuery({
      queryKey: ['global-users-with-roles'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_all_users_with_roles');
        if (error) throw error;
        return data as GlobalUser[];
      },
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
    });
  };

  // Get all portfolios with their roles - admin only
  const useAllPortfoliosWithRoles = () => {
    return useQuery({
      queryKey: ['global-portfolios-with-roles'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_all_portfolios_with_roles');
        if (error) throw error;
        return data as GlobalPortfolio[];
      },
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
    });
  };

  // Admin grant account role
  const useAdminGrantAccountRole = () => {
    return useMutation({
      mutationFn: async ({ 
        targetUserId, 
        role, 
        notes 
      }: { 
        targetUserId: string; 
        role: 'owner' | 'admin_partner' | 'support_assistant'; 
        notes?: string;
      }) => {
        const { data, error } = await supabase.rpc('admin_grant_account_role', {
          p_target_user_id: targetUserId,
          p_role: role,
          p_notes: notes
        });
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-account-roles'] });
        queryClient.invalidateQueries({ queryKey: ['global-users-with-roles'] });
        toast({
          title: "Account Role Granted",
          description: "Successfully granted account role.",
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
  };

  // Admin revoke account role
  const useAdminRevokeAccountRole = () => {
    return useMutation({
      mutationFn: async ({ accountRoleId }: { accountRoleId: string }) => {
        const { data, error } = await supabase.rpc('admin_revoke_account_role', {
          p_account_role_id: accountRoleId
        });
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-account-roles'] });
        toast({
          title: "Account Role Revoked",
          description: "Successfully revoked account role.",
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
  };

  // Admin grant portfolio role
  const useAdminGrantPortfolioRole = () => {
    return useMutation({
      mutationFn: async ({ 
        portfolioId, 
        targetUserId, 
        role 
      }: { 
        portfolioId: string; 
        targetUserId: string; 
        role: 'admin_partner' | 'editor' | 'viewer' | 'maintenance';
      }) => {
        const { data, error } = await supabase.rpc('admin_grant_portfolio_role', {
          p_portfolio_id: portfolioId,
          p_target_user_id: targetUserId,
          p_role: role
        });
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
        toast({
          title: "Portfolio Role Granted",
          description: "Successfully granted portfolio role.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Grant Portfolio Role",
          description: error.message || "An error occurred while granting the portfolio role.",
          variant: "destructive",
        });
      },
    });
  };

  // Admin revoke portfolio role
  const useAdminRevokePortfolioRole = () => {
    return useMutation({
      mutationFn: async ({ portfolioRoleId }: { portfolioRoleId: string }) => {
        const { data, error } = await supabase.rpc('admin_revoke_portfolio_role', {
          p_portfolio_role_id: portfolioRoleId
        });
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['global-portfolios-with-roles'] });
        toast({
          title: "Portfolio Role Revoked",
          description: "Successfully revoked portfolio role.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to Revoke Portfolio Role",
          description: error.message || "An error occurred while revoking the portfolio role.",
          variant: "destructive",
        });
      },
    });
  };

  return {
    useAllUsersWithRoles,
    useAllPortfoliosWithRoles,
    useAdminGrantAccountRole,
    useAdminRevokeAccountRole,
    useAdminGrantPortfolioRole,
    useAdminRevokePortfolioRole,
  };
};
