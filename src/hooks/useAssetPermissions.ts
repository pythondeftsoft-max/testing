
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AssetPermission {
  asset_id: string;
  role: 'manager' | 'editor' | 'viewer' | 'billing_only';
  is_active: boolean;
}

export const useAssetPermissions = () => {
  const { user } = useAuth();

  const { data: assetPermissions = [], isLoading } = useQuery({
    queryKey: ['asset-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('portfolio_asset_memberships')
        .select('asset_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching asset permissions:', error);
        return [];
      }

      return data as AssetPermission[];
    },
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
  });

  const hasAssetPermission = (
    assetId: string,
    action: 'view' | 'edit' | 'delete' | 'manage'
  ): boolean => {
    const permission = assetPermissions.find(p => p.asset_id === assetId);
    
    if (!permission) {
      return false;
    }

    // Define role capabilities
    const roleCapabilities = {
      manager: ['view', 'edit', 'delete', 'manage'],
      editor: ['view', 'edit'],
      viewer: ['view'],
      billing_only: ['view'] // Limited view for billing-related info
    };

    return roleCapabilities[permission.role]?.includes(action) || false;
  };

  return {
    assetPermissions,
    hasAssetPermission,
    isLoading
  };
};
