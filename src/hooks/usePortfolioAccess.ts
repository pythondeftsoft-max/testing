
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioRoles, PortfolioRoleType } from './usePortfolioRoles';
import { useAuth } from './useAuth';

interface UsePortfolioAccessProps {
  portfolioId: string;
  userId: string;
  requiredRoles?: PortfolioRoleType[];
  redirectOnNoAccess?: boolean;
}

export const usePortfolioAccess = ({ 
  portfolioId, 
  userId, 
  requiredRoles = ['viewer'],
  redirectOnNoAccess = false 
}: UsePortfolioAccessProps) => {
  const { userRole, permissions, hasRole, loading: portfolioLoading } = usePortfolioRoles(portfolioId, userId);
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accountAccess, setAccountAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check account-level access as fallback
  useEffect(() => {
    const checkAccountAccess = async () => {
      if (!user?.id) {
        setAccountAccess(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any).rpc('has_account_permission', {
          p_user_id: user.id,
          p_object: 'admin.portfolio_management',
          p_action: 'view'
        });

        if (error) {
          console.error('Error checking account access:', error);
          setAccountAccess(false);
        } else {
          setAccountAccess(data as boolean);
        }
      } catch (err) {
        console.error('Error in checkAccountAccess:', err);
        setAccountAccess(false);
      }
    };

    checkAccountAccess();
  }, [user?.id]);

  useEffect(() => {
    if (portfolioLoading || accountAccess === null) {
      setLoading(true);
      return;
    }

    setLoading(false);

    // Grant access if user has portfolio role OR account-level access
    const portfolioRoleAccess = userRole ? hasRole(requiredRoles) : false;
    const access = portfolioRoleAccess || accountAccess;
    
    setHasAccess(access);

    if (!access && redirectOnNoAccess) {
      console.warn('User does not have required portfolio access:', {
        userId,
        portfolioId,
        requiredRoles,
        userRole: userRole?.role_name,
        accountAccess
      });
    }
  }, [userRole, portfolioLoading, accountAccess, hasRole, requiredRoles, redirectOnNoAccess, userId, portfolioId]);

  return {
    hasAccess,
    userRole,
    permissions,
    loading,
    isAuthorized: hasAccess === true,
    isDenied: hasAccess === false && !loading,
  };
};
