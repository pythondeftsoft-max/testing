import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * usePmMode
 *
 * Reads + updates the landlord's `pm_mode_enabled` flag on the profiles table.
 *
 * Behavior:
 * - PM mode is a one-way upgrade for landlords. Once `pm_mode_enabled = true`,
 *   `setMode(false)` will refuse to downgrade (admins use a dedicated override flow).
 * - Every successful change is logged to `account_mode_changes` as a non-blocking
 *   audit row. Audit failure never prevents the mode flip itself.
 * - Defaults to `pmEnabled = true` while loading so PM users never flicker into
 *   the trimmed Listing UI by accident.
 *
 * Return shape:
 * - `pmEnabled`     current mode
 * - `loading`       initial profile fetch in flight
 * - `canRevert`     false once user is in PM mode (sticky)
 * - `setMode`       attempts to flip mode; rejects self-downgrade from PM
 * - `refresh`       re-reads the profile flag
 */
export function usePmMode() {
  const [pmEnabled, setPmEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('pm_mode_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data && typeof (data as any).pm_mode_enabled === 'boolean') {
        setPmEnabled((data as any).pm_mode_enabled);
      }
    } catch (err) {
      console.warn('usePmMode load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setMode = useCallback(async (enabled: boolean) => {
    if (!userId) return { error: new Error('Not signed in') as any };

    // Sticky upgrade: refuse self-downgrade from PM mode.
    if (pmEnabled && !enabled) {
      return {
        error: new Error(
          'PM mode is permanent. Contact support if you need to revert.'
        ) as any,
      };
    }

    const previous = pmEnabled;

    // Optimistic update
    setPmEnabled(enabled);
    const { error } = await supabase
      .from('profiles')
      .update({ pm_mode_enabled: enabled } as any)
      .eq('id', userId);

    if (error) {
      // Revert on failure
      setPmEnabled(previous);
      return { error };
    }

    // Non-blocking audit log
    try {
      await supabase.from('account_mode_changes').insert({
        user_id: userId,
        previous_mode: previous,
        new_mode: enabled,
        changed_by: userId,
        changed_by_role: 'self',
      } as any);
    } catch (auditErr) {
      console.warn('usePmMode audit insert failed (non-blocking)', auditErr);
    }

    return { error: null };
  }, [userId, pmEnabled]);

  // Sticky once enabled (admins use AdminAccountModeOverride for reverts)
  const canRevert = !pmEnabled;

  return { pmEnabled, loading, canRevert, setMode, refresh: load };
}
