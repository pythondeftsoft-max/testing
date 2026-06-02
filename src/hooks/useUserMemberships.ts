import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserMemberships = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('portfolio_asset_memberships')
        .select(`
          id,
          asset_id,
          role,
          is_active,
          created_at,
          portfolio_assets!inner(
            id,
            asset_name,
            portfolio_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user memberships:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useHasTenantMemberships = () => {
  const { data: memberships, isLoading } = useUserMemberships();
  
  // Check for any asset memberships that could involve rent payments
  // This could be tenant-like roles or any asset membership with recurring charges
  const hasAssetMemberships = memberships && memberships.length > 0;
  
  return { hasTenantRole: hasAssetMemberships, isLoading };
};