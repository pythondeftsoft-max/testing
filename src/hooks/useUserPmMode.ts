import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * useUsersPmMode
 *
 * Bulk-fetches `pm_mode_enabled` for a set of user IDs so the admin user table
 * can render a "Mode" badge per row. Returns a Record<userId, boolean>.
 */
export const useUsersPmMode = (userIds: string[]) => {
  const sortedKey = [...userIds].sort().join(',');
  return useQuery({
    queryKey: ['users-pm-mode', sortedKey],
    enabled: userIds.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, pm_mode_enabled')
        .in('id', userIds);
      if (error) {
        console.warn('useUsersPmMode failed', error);
        return {};
      }
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((row: any) => {
        map[row.id] = !!row.pm_mode_enabled;
      });
      return map;
    },
  });
};

/**
 * useUserPmMode
 *
 * Fetches a single user's `pm_mode_enabled` flag. Used by the admin override card.
 */
export const useUserPmMode = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user-pm-mode', userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async (): Promise<boolean | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('pm_mode_enabled')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.warn('useUserPmMode failed', error);
        return null;
      }
      return (data as any)?.pm_mode_enabled ?? false;
    },
  });
};

/**
 * useUserModeChangeHistory
 *
 * Returns the audit trail of mode changes for a given user, newest first.
 */
export const useUserModeChangeHistory = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user-mode-history', userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('account_mode_changes')
        .select('id, previous_mode, new_mode, changed_by, changed_by_role, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('useUserModeChangeHistory failed', error);
        return [];
      }
      return data ?? [];
    },
  });
};

/**
 * useAdminSetUserPmMode
 *
 * Admin-only override that flips a target user's PM mode in either direction
 * and writes an audit row tagged `changed_by_role = 'admin'` with an optional
 * reason. RLS enforces that only admins can call this (the audit insert RLS
 * checks `has_role(auth.uid(), 'admin')`).
 */
export const useAdminSetUserPmMode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      newMode: boolean;
      previousMode: boolean;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ pm_mode_enabled: params.newMode } as any)
        .eq('id', params.userId);
      if (updateErr) throw updateErr;

      // Audit row (non-blocking — log warning if it fails but don't undo the flip)
      const { error: auditErr } = await supabase.from('account_mode_changes').insert({
        user_id: params.userId,
        previous_mode: params.previousMode,
        new_mode: params.newMode,
        changed_by: user.id,
        changed_by_role: 'admin',
        reason: params.reason ?? null,
      } as any);
      if (auditErr) {
        console.warn('admin mode change audit insert failed', auditErr);
      }

      return { ok: true };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user-pm-mode', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-mode-history', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['users-pm-mode'] });
    },
  });
};
