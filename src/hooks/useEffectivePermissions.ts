
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EffectivePermissions {
  [objectName: string]: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    create: boolean;
  };
}

export const useAccountEffectivePermissions = () => {
  const { user } = useAuth();

  return useQuery<EffectivePermissions, Error>({
    queryKey: ['account-effective-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const { data, error } = await (supabase as any).rpc('get_account_effective_permissions', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching account effective permissions:', error);
        return {};
      }

      return data as EffectivePermissions;
    },
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
  });
};

export const usePortfolioEffectivePermissions = (portfolioId: string | null) => {
  const { user } = useAuth();

  return useQuery<EffectivePermissions, Error>({
    queryKey: ['portfolio-effective-permissions', portfolioId, user?.id],
    queryFn: async () => {
      if (!user?.id || !portfolioId) return {};

      const { data, error } = await (supabase as any).rpc('get_portfolio_effective_permissions', {
        p_user_id: user.id,
        p_portfolio_id: portfolioId
      });

      if (error) {
        console.error('Error fetching portfolio effective permissions:', error);
        return {};
      }

      return data as EffectivePermissions;
    },
    enabled: !!user?.id && !!portfolioId,
    staleTime: 300000, // 5 minutes
  });
};
