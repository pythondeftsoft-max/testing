import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AccessGrant {
  id: string;
  user_id: string;
  scope: 'account' | 'portfolio';
  portfolio_id: string | null;
  object_name: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  created_by: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  request_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAccessGrants = (userId?: string, adminView = false) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active grants
  const {
    data: grants,
    isLoading,
    error
  } = useQuery({
    queryKey: ['access-grants', userId || user?.id, adminView],
    queryFn: async () => {
      let query = supabase
        .from('access_grants')
        .select(`
          *,
          user:profiles!access_grants_user_id_fkey(first_name, last_name, email),
          granter:profiles!access_grants_created_by_fkey(first_name, last_name),
          portfolio:portfolios(name)
        `)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (!adminView && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  // Revoke access grant (admin only)
  const revokeGrant = useMutation({
    mutationFn: async ({ grantId, reason }: { grantId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('revoke_access_grant', {
        p_grant_id: grantId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Grant Revoked",
        description: "Access grant has been revoked successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['access-grants'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to revoke grant. Please try again.",
        variant: "destructive",
      });
      console.error('Revoke access grant error:', error);
    },
  });

  return {
    grants,
    isLoading,
    error,
    revokeGrant,
  };
};