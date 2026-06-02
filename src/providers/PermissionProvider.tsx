
import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAccountEffectivePermissions, usePortfolioEffectivePermissions, EffectivePermissions } from '@/hooks/useEffectivePermissions';
import { useActiveGrants } from '@/hooks/useActiveGrants';
import { useAssetPermissions } from '@/hooks/useAssetPermissions';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useAuth } from '@/providers/AuthProvider';

interface PermissionContextValue {
  accountPermissions: EffectivePermissions;
  portfolioPermissions: EffectivePermissions;
  hasPermission: (
    objectName: string,
    action: 'view' | 'edit' | 'delete' | 'create',
    scope: 'account' | 'portfolio'
  ) => boolean | 'via_grant';
  hasAssetPermission: (
    assetId: string,
    action: 'view' | 'edit' | 'delete' | 'manage'
  ) => boolean;
  loading: boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

interface PermissionProviderProps {
  children: React.ReactNode;
  portfolioId?: string | null;
}

// Helper function to validate UUID format
const isValidUUID = (str: string | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Public route prefixes where permission queries are unnecessary
const PUBLIC_PREFIXES = [
  '/', '/auth', '/login', '/signup', '/about', '/blog', '/faq', '/contact',
  '/privacy', '/terms', '/resources', '/section8-info', '/application-process',
  '/investor-signup', '/find-home', '/tenants', '/landlords/', '/housing/',
  '/section-8/', '/rent-data/', '/compare/', '/property-management/', '/pay/',
];

const isPublicRoute = (pathname: string): boolean => {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some(prefix => prefix !== '/' && pathname.startsWith(prefix));
};

// Empty context for public routes / unauthenticated users
const EMPTY_CONTEXT: PermissionContextValue = {
  accountPermissions: {},
  portfolioPermissions: {},
  hasPermission: () => false,
  hasAssetPermission: () => false,
  loading: false,
};

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  children,
  portfolioId: propPortfolioId,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Skip all queries on public routes or when no user is logged in
  const shouldSkip = !user?.id || isPublicRoute(location.pathname);

  if (shouldSkip) {
    return (
      <PermissionContext.Provider value={EMPTY_CONTEXT}>
        {children}
      </PermissionContext.Provider>
    );
  }

  return (
    <PermissionProviderInner portfolioId={propPortfolioId}>
      {children}
    </PermissionProviderInner>
  );
};

// Inner component that only mounts when user is authenticated on a protected route
const PermissionProviderInner: React.FC<PermissionProviderProps> = ({
  children,
  portfolioId: propPortfolioId,
}) => {
  const [searchParams] = useSearchParams();
  const urlPortfolioId = searchParams.get('portfolioId');
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { user } = useAuth();
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  
  // Use prop portfolioId first, then URL params
  const rawPortfolioId = propPortfolioId || urlPortfolioId;
  
  // Check if user can access aggregate view (either admin or has portfolios)
  const canAccessAggregateView = isAdmin || (portfolios && portfolios.length > 0);
  
  // Validate portfolioId - allow "everything" for users with portfolio access, otherwise require valid UUID
  const portfolioId = rawPortfolioId === 'everything' && canAccessAggregateView 
    ? null  // Don't query specific portfolio permissions for aggregate view
    : isValidUUID(rawPortfolioId) ? rawPortfolioId : null;
  
  const { 
    data: accountPermissions = {}, 
    isLoading: accountLoading 
  } = useAccountEffectivePermissions();

  const { 
    data: portfolioPermissions = {}, 
    isLoading: portfolioLoading 
  } = usePortfolioEffectivePermissions(portfolioId);

  const { data: activeGrants = [], isLoading: grantsLoading } = useActiveGrants();
  
  const { hasAssetPermission: checkAssetPermission, isLoading: assetLoading } = useAssetPermissions();

  const hasPermission = useMemo(() => {
    return (
      objectName: string,
      action: 'view' | 'edit' | 'delete' | 'create',
      scope: 'account' | 'portfolio'
    ): boolean | 'via_grant' => {
      // Special case: Users with portfolio access have full access when viewing aggregate data
      const hasAggregateDataAccess = canAccessAggregateView && rawPortfolioId === 'everything';
      if (hasAggregateDataAccess) {
        return true;
      }

      const loading = accountLoading || portfolioLoading || grantsLoading || adminLoading || portfoliosLoading;
      
      if (loading) {
        return false;
      }

      const permissions = scope === 'account' ? accountPermissions : portfolioPermissions;
      const basePermission = permissions[objectName]?.[action] || false;
      
      if (basePermission) {
        return true;
      }
      
      const matchingGrant = activeGrants.find(grant => 
        grant.scope === scope &&
        grant.object_name === objectName &&
        grant.action === action &&
        (scope === 'account' || grant.portfolio_id === portfolioId)
      );
      
      if (matchingGrant) {
        return 'via_grant';
      }
      
      return false;
    };
  }, [accountPermissions, portfolioPermissions, activeGrants, accountLoading, portfolioLoading, grantsLoading, adminLoading, portfoliosLoading, canAccessAggregateView, rawPortfolioId, portfolioId]);

  const hasAssetPermission = useMemo(() => {
    return (assetId: string, action: 'view' | 'edit' | 'delete' | 'manage'): boolean => {
      if (assetLoading) return false;
      return checkAssetPermission(assetId, action);
    };
  }, [assetLoading, checkAssetPermission]);

  const value: PermissionContextValue = useMemo(() => ({
    accountPermissions,
    portfolioPermissions,
    hasPermission,
    hasAssetPermission,
    loading: accountLoading || portfolioLoading || grantsLoading || assetLoading || adminLoading || portfoliosLoading,
  }), [accountPermissions, portfolioPermissions, hasPermission, hasAssetPermission, accountLoading, portfolioLoading, grantsLoading, assetLoading, adminLoading, portfoliosLoading]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextValue => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
