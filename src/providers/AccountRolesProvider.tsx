
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// Account role types matching the database enum
export type AccountRoleType = 'owner' | 'admin_partner' | 'support_assistant';

interface AccountRole {
  id: string;
  user_id: string;
  role_name: AccountRoleType;
  added_by?: string;
  granted_at: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Permission {
  object_name: string;
  display_name: string;
  category: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

interface AccountRolePermissions {
  canManageAccountRoles: boolean;
  canManageSubscriptions: boolean;
  canManageAllPortfolios: boolean;
  canViewAccountAnalytics: boolean;
  canManageAccountSettings: boolean;
  canViewAllUsers: boolean;
  canManageProperties: boolean;
  canAccessAdminPanel: boolean;
}

const getAccountRoleLevel = (role: AccountRoleType): number => {
  switch (role) {
    case 'owner': return 3;
    case 'admin_partner': return 2;
    case 'support_assistant': return 1;
    default: return 0;
  }
};

const getHighestAccountRole = (roles: AccountRoleType[]): AccountRoleType | null => {
  if (!roles.length) return null;
  return roles.reduce((highest, current) =>
    getAccountRoleLevel(current) > getAccountRoleLevel(highest) ? current : highest
  );
};

const isValidAccountRoleType = (role: any): role is AccountRoleType => {
  return typeof role === 'string' && ['owner', 'admin_partner', 'support_assistant'].includes(role);
};

export interface AccountRolesContextValue {
  userAccountRoles: AccountRole[];
  allAccountRoles: any[];
  userPermissions: Permission[];
  highestAccountRole: AccountRoleType | null;
  accountPermissions: AccountRolePermissions;
  hasAccountRole: (requiredRoles: AccountRoleType[]) => boolean;
  hasPermission: (objectName: string, action: 'view' | 'edit' | 'delete' | 'create') => boolean;
  isAccountOwner: boolean;
  isAccountAdmin: boolean;
  canManageAccount: boolean;
  loading: boolean;
  rolesDetermined: boolean;
  hasErrors: any;
  lastError: string | null;
  refreshRoles: () => void;
  allRolesLoading: boolean;
  allRolesError: any;
  permissionsLoading: boolean;
  statusFilter: 'active' | 'inactive' | 'all';
  setStatusFilter: (filter: 'active' | 'inactive' | 'all') => void;
}

const AccountRolesContext = createContext<AccountRolesContextValue | null>(null);

export const AccountRolesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id ?? null;

  const { data: isSystemAdmin, isLoading: adminCheckLoading } = useAdminCheck();

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const [cachedRole, setCachedRole] = useState<AccountRoleType | null>(() => {
    try {
      const stored = localStorage.getItem('lastKnownRole');
      return stored as AccountRoleType || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!currentUserId) {
      setCachedRole(null);
      localStorage.removeItem('lastKnownRole');
    }
  }, [currentUserId]);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['user-profile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', currentUserId)
        .maybeSingle();
      if (error) {
        setLastError(`Profile query failed: ${error.message}`);
        throw error;
      }
      setLastError(null);
      return data;
    },
    enabled: !!currentUserId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: userAccountRoles,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRolesQuery
  } = useQuery({
    queryKey: ['account-roles', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('account_roles')
        .select('id, user_id, role_name, is_active, added_by, created_at, updated_at')
        .eq('user_id', currentUserId)
        .eq('is_active', true);
      if (error) {
        setLastError(`Roles query failed: ${error.message}`);
        throw error;
      }
      const roles: AccountRole[] = (data || []).map((role: any) => ({
        id: role.id,
        user_id: currentUserId,
        role_name: role.role_name,
        added_by: role.added_by,
        granted_at: role.created_at,
        is_active: role.is_active,
        notes: role.notes,
        created_at: role.created_at,
        updated_at: role.updated_at,
      }));
      setLastError(null);
      return roles;
    },
    enabled: !!currentUserId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
  });

  const refreshRoles = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
    setLastError(null);
    refetchProfile();
    refetchRolesQuery();
  }, [refetchProfile, refetchRolesQuery]);

  const [rolesDetermined, setRolesDetermined] = useState(false);

  const isRolesDetermined = useMemo(() => {
    if (cachedRole) return true;
    if (!adminCheckLoading && isSystemAdmin) return true;
    if (!rolesLoading) return true;
    return false;
  }, [cachedRole, adminCheckLoading, isSystemAdmin, rolesLoading]);

  useEffect(() => {
    setRolesDetermined(false);
  }, [refreshCounter]);

  useEffect(() => {
    if (isRolesDetermined && !rolesDetermined) {
      setRolesDetermined(true);
    }
  }, [isRolesDetermined, rolesDetermined]);

  const criticalLoading = !currentUserId;
  const hasErrors = profileError || rolesError;

  const highestAccountRole = useMemo(() => {
    if (!currentUserId) return null;

    if (cachedRole) return cachedRole;

    if (isSystemAdmin) {
      const role = 'owner' as AccountRoleType;
      setCachedRole(role);
      try { localStorage.setItem('lastKnownRole', role); } catch {}
      return role;
    }

    if (!rolesLoading && userAccountRoles) {
      if (userAccountRoles.length > 0) {
        const roleNames = userAccountRoles
          .filter(role => role.is_active)
          .map(role => role.role_name)
          .filter(isValidAccountRoleType);
        const highest = getHighestAccountRole(roleNames);
        if (highest && highest !== cachedRole) {
          setCachedRole(highest);
          try { localStorage.setItem('lastKnownRole', highest); } catch {}
        }
        return highest;
      } else {
        return 'owner' as AccountRoleType;
      }
    }

    if (adminCheckLoading || rolesLoading) return null;

    return null;
  }, [userAccountRoles, isSystemAdmin, currentUserId, adminCheckLoading, rolesLoading, cachedRole, rolesDetermined]);

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', highestAccountRole],
    queryFn: async () => {
      if (!highestAccountRole) return [];
      try {
        const { data, error } = await supabase
          .rpc('get_role_permissions' as any, { role_name_param: highestAccountRole });
        if (error) return [];
        return ((data as any) || []) as Permission[];
      } catch {
        return [];
      }
    },
    enabled: !!highestAccountRole,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const { data: allAccountRoles, isLoading: allRolesLoading, error: allRolesError } = useQuery({
    queryKey: ['all-account-roles-with-details', statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_all_account_roles_with_emails' as any);
      if (error) throw error;
      const mapped = ((data as any[]) || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        role_name: r.role_name,
        is_active: r.is_active,
        added_by: r.added_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
        profiles: {
          first_name: r.first_name,
          last_name: r.last_name,
          user_type: r.user_type,
        },
        user_email: r.user_email,
        last_sign_in_at: r.last_sign_in_at,
      }));
      if (statusFilter === 'active') return mapped.filter((r: any) => r.is_active === true);
      if (statusFilter === 'inactive') return mapped.filter((r: any) => r.is_active === false);
      return mapped;
    },
    enabled: !!currentUserId && isSystemAdmin === true,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    retryDelay: 1000,
  });

  const hasAccountRole = useCallback((requiredRoles: AccountRoleType[]): boolean => {
    if (!currentUserId) return false;
    if (isSystemAdmin && requiredRoles.includes('owner')) return true;
    if (!userAccountRoles || userAccountRoles.length === 0) return false;
    const activeRoles = userAccountRoles
      .filter(role => role.is_active)
      .map(role => role.role_name)
      .filter(isValidAccountRoleType);
    return requiredRoles.some(role => activeRoles.includes(role));
  }, [currentUserId, userAccountRoles, isSystemAdmin]);

  const hasPermission = useCallback((objectName: string, action: 'view' | 'edit' | 'delete' | 'create'): boolean => {
    if (!objectName || !action) return false;
    if (highestAccountRole === 'owner') return true;
    const perm = (userPermissions as Permission[] | undefined)?.find(p => p.object_name === objectName);
    if (!perm) return false;
    switch (action) {
      case 'view': return !!perm.can_view;
      case 'edit': return !!perm.can_edit;
      case 'delete': return !!perm.can_delete;
      case 'create': return !!perm.can_create;
      default: return false;
    }
  }, [highestAccountRole, userPermissions]);

  const accountPermissions: AccountRolePermissions = useMemo(() => {
    const role = highestAccountRole || '';
    return {
      canManageAccountRoles: ['owner'].includes(role),
      canManageSubscriptions: ['owner'].includes(role),
      canManageAllPortfolios: ['owner', 'admin_partner'].includes(role),
      canViewAccountAnalytics: ['owner', 'admin_partner'].includes(role),
      canManageAccountSettings: ['owner', 'admin_partner'].includes(role),
      canViewAllUsers: ['owner', 'admin_partner'].includes(role),
      canManageProperties: ['owner', 'admin_partner'].includes(role),
      canAccessAdminPanel: ['owner', 'admin_partner', 'support_assistant'].includes(role),
    };
  }, [highestAccountRole]);

  const isAccountOwner = highestAccountRole === 'owner';
  const isAccountAdmin = ['owner', 'admin_partner'].includes(highestAccountRole || '');
  const canManageAccount = ['owner'].includes(highestAccountRole || '');

  // Single realtime subscription for RBAC changes
  useEffect(() => {
    const channel = supabase
      .channel('rbac-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['account-roles'] });
        queryClient.invalidateQueries({ queryKey: ['all-account-roles-with-details'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
        queryClient.invalidateQueries({ queryKey: ['permission-objects'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'permission_objects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['permission-objects'] });
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const value: AccountRolesContextValue = {
    userAccountRoles: userAccountRoles || [],
    allAccountRoles: allAccountRoles || [],
    userPermissions: userPermissions || [],
    highestAccountRole,
    accountPermissions,
    hasAccountRole,
    hasPermission,
    isAccountOwner,
    isAccountAdmin,
    canManageAccount,
    loading: criticalLoading,
    rolesDetermined: isRolesDetermined,
    hasErrors,
    lastError,
    refreshRoles,
    allRolesLoading,
    allRolesError,
    permissionsLoading,
    statusFilter,
    setStatusFilter,
  };

  return (
    <AccountRolesContext.Provider value={value}>
      {children}
    </AccountRolesContext.Provider>
  );
};

export const useAccountRolesContext = (): AccountRolesContextValue => {
  const context = useContext(AccountRolesContext);
  if (!context) {
    throw new Error('useAccountRolesContext must be used within an AccountRolesProvider');
  }
  return context;
};
