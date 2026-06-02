
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// Helper function to get role hierarchy level (higher number = more permissions)
const getRoleLevel = (role: PortfolioRoleType): number => {
  switch (role) {
    case 'admin_partner': return 4;
    case 'editor': return 3;
    case 'viewer': return 2;
    case 'maintenance': return 1;
    default: return 0;
  }
};

// Helper function to get the highest role from an array of roles
const getHighestRole = (roles: PortfolioRoleType[]): PortfolioRoleType | null => {
  if (!roles.length) return null;
  
  return roles.reduce((highest, current) => {
    return getRoleLevel(current) > getRoleLevel(highest) ? current : highest;
  });
};

// Helper function to validate if a string is a valid PortfolioRoleType
const isValidPortfolioRoleType = (role: any): role is PortfolioRoleType => {
  return typeof role === 'string' && 
    ['admin_partner', 'editor', 'viewer', 'maintenance'].includes(role);
};

// Helper function to get default permissions (all false for safety)
const getDefaultPermissions = (): PortfolioRolePermissions => ({
  canManageRoles: false,
  canManageProperties: false,
  canEditProperties: false,
  canViewProperties: false,
  canManageTenants: false,
  canViewTenants: false,
  canManageApplications: false,
  canViewApplications: false,
  canManageMaintenance: false,
  canViewMaintenance: false,
  canManageFinances: false,
  canViewFinances: false,
  canUploadDocuments: false,
  canViewRewardActivity: false,
  canViewAnalytics: false,
});

export type PortfolioRoleType = 'admin_partner' | 'editor' | 'viewer' | 'maintenance';

interface PortfolioRole {
  id: string;
  portfolio_id: string;
  user_id: string;
  role_name: PortfolioRoleType;
  role_tag?: string;
  added_by?: string;
  permissions_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PortfolioRolePermissions {
  canManageRoles: boolean;
  canManageProperties: boolean;
  canEditProperties: boolean;
  canViewProperties: boolean;
  canManageTenants: boolean;
  canViewTenants: boolean;
  canManageApplications: boolean;
  canViewApplications: boolean;
  canManageMaintenance: boolean;
  canViewMaintenance: boolean;
  canManageFinances: boolean;
  canViewFinances: boolean;
  canUploadDocuments: boolean;
  canViewRewardActivity: boolean;
  canViewAnalytics: boolean;
}

export const usePortfolioRoles = (portfolioId: string, userId?: string) => {
  const currentUserId = userId || null;

  // Use secure is_admin RPC check instead of profile.user_type
  const { data: isSystemAdmin, isLoading: adminCheckLoading } = useAdminCheck();

  // Get user's role in this portfolio (or highest role for "everything" view)
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['portfolio-role', portfolioId, currentUserId, isSystemAdmin],
    queryFn: async () => {
      if (!currentUserId) return null;
      
      // First check if user is admin using secure RPC - if so, return virtual admin_partner role
      if (isSystemAdmin) {
        return {
          id: 'virtual-admin-role',
          portfolio_id: portfolioId,
          user_id: currentUserId,
          role_name: 'admin_partner' as PortfolioRoleType,
          permissions_level: 5,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PortfolioRole;
      }
  
      // Handle "everything" portfolio - get user's highest role across all portfolios
      if (portfolioId === 'everything') {
        try {
          // Use direct SQL query instead of RPC to avoid TypeScript issues
          const { data: roleData, error } = await supabase
            .from('portfolio_roles')
            .select('role_name')
            .eq('user_id', currentUserId)
            .eq('is_active', true);
  
          if (error) {
            console.error('Error fetching user portfolio roles:', error);
            return null;
          }
  
          if (roleData && roleData.length > 0) {
            // Get all valid roles and find the highest one
            const validRoles = roleData
              .map(r => r.role_name)
              .filter(isValidPortfolioRoleType);
            
            const highestRole = getHighestRole(validRoles);
            
            if (highestRole) {
              return {
                id: 'virtual-everything-role',
                portfolio_id: 'everything',
                user_id: currentUserId,
                role_name: highestRole,
                permissions_level: getRoleLevel(highestRole),
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as PortfolioRole;
            }
          }
          
          return null;
        } catch (error) {
          console.error('Error fetching user highest portfolio role:', error);
          return null;
        }
      }
      
      // Handle specific portfolio - existing logic
      const { data: roleData, error: roleError } = await supabase
        .from('portfolio_roles')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();
  
      if (roleData && !roleError) {
        return roleData as PortfolioRole;
      }
  
      // Fallback: Check if user is the portfolio manager
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('manager_id')
        .eq('id', portfolioId)
        .single();
  
      if (portfolioError) {
        console.error('Error fetching portfolio:', portfolioError);
        return null;
      }
  
      // If user is the manager, create a virtual admin_partner role
      if (portfolioData.manager_id === currentUserId) {
        return {
          id: 'virtual-manager-role',
          portfolio_id: portfolioId,
          user_id: currentUserId,
          role_name: 'admin_partner' as PortfolioRoleType,
          permissions_level: 5,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PortfolioRole;
      }
  
      return null;
    },
    enabled: !!currentUserId && !!portfolioId && !adminCheckLoading,
  });

  // Get all roles for this portfolio (for admin view)
  const { data: portfolioRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['portfolio-roles', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_roles')
        .select(`
          *,
          profiles!portfolio_roles_user_id_fkey(first_name, last_name)
        `)
        .eq('portfolio_id', portfolioId)
        .eq('is_active', true)
        .order('permissions_level', { ascending: false });

      if (error) {
        console.error('Error fetching portfolio roles:', error);
        return [];
      }

      return data as (PortfolioRole & { profiles: { first_name: string; last_name: string } })[];
    },
    enabled: !!portfolioId,
  });

  // Create a stable hasRole function using useMemo to avoid dependency array issues
  const hasRole = useMemo(() => {
    return (requiredRoles: PortfolioRoleType[]): boolean => {
      const currentRoleName = userRole?.role_name;
      if (!currentRoleName) return false;
      return requiredRoles.includes(currentRoleName);
    };
  }, [userRole?.role_name]);

  // Calculate permissions based on user's role - memoized for performance
  const roleName = userRole?.role_name || '';
  const permissions: PortfolioRolePermissions = useMemo(() => ({
    canManageRoles: roleName === 'admin_partner',
    canManageProperties: ['admin_partner', 'editor'].includes(roleName),
    canEditProperties: ['admin_partner', 'editor'].includes(roleName),
    canViewProperties: ['admin_partner', 'editor', 'viewer', 'maintenance'].includes(roleName),
    canManageTenants: ['admin_partner', 'editor'].includes(roleName),
    canViewTenants: ['admin_partner', 'editor', 'viewer'].includes(roleName),
    canManageApplications: ['admin_partner', 'editor'].includes(roleName),
    canViewApplications: ['admin_partner', 'editor', 'viewer'].includes(roleName),
    canManageMaintenance: ['admin_partner', 'editor', 'maintenance'].includes(roleName),
    canViewMaintenance: ['admin_partner', 'editor', 'viewer', 'maintenance'].includes(roleName),
    canManageFinances: ['admin_partner', 'editor'].includes(roleName),
    canViewFinances: ['admin_partner', 'editor', 'viewer'].includes(roleName),
    canUploadDocuments: ['admin_partner', 'editor'].includes(roleName),
    canViewRewardActivity: ['admin_partner', 'editor', 'viewer'].includes(roleName),
    canViewAnalytics: ['admin_partner', 'editor', 'viewer'].includes(roleName),
  }), [roleName]);
  
  // Memoize computed values for performance
  const isAdminPartner = useMemo(() => roleName === 'admin_partner', [roleName]);
  const canManagePortfolio = useMemo(() => ['admin_partner', 'editor'].includes(roleName), [roleName]);

  // Temporary debug logging to track role resolution (remove after testing)
  useEffect(() => {
    console.log('Portfolio Role Resolution Debug:', {
      portfolioId,
      currentUserId,
      userRole: userRole?.role_name,
      permissions,
      loading: adminCheckLoading || roleLoading || rolesLoading,
      isSystemAdmin
    });
  }, [portfolioId, currentUserId, userRole?.role_name, permissions, adminCheckLoading, roleLoading, rolesLoading, isSystemAdmin]);

  const loading = adminCheckLoading || roleLoading || rolesLoading;

  return {
    userRole,
    portfolioRoles: portfolioRoles || [],
    permissions,
    hasRole,
    isAdminPartner,
    canManagePortfolio,
    loading,
  };

};
