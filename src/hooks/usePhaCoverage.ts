import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MissingPha {
  code: string;
  name: string;
  state: string;
}

export interface StateGap {
  state: string;
  hud: number;
  ours: number;
  gap: number;
}

export interface CoverageSnapshot {
  id?: string;
  hud_total: number;
  our_total: number;
  missing: MissingPha[];
  by_state: StateGap[];
  checked_at: string;
}

export function usePhaCoverage() {
  return useQuery({
    queryKey: ['pha-coverage-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('pha-coverage-check');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Failed to load coverage');
      return data.snapshot as CoverageSnapshot;
    },
    staleTime: 60_000,
  });
}

export function useRefreshPhaCoverage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pha-coverage-check', {
        body: { force: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Failed to refresh');
      return data.snapshot as CoverageSnapshot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pha-coverage-snapshot'] });
    },
  });
}

export interface BackfillResult {
  hud_total: number;
  existing_total: number;
  candidates: number;
  inserted: number;
  errors: any[];
}

export function useBackfillMissingPhas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pha-backfill-missing');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Backfill failed');
      return data as BackfillResult & { success: true };
    },
    onSuccess: async () => {
      // Refresh the coverage snapshot from HUD (force re-check)
      try {
        await supabase.functions.invoke('pha-coverage-check', { body: { force: true } });
      } catch {
        // non-fatal
      }
      qc.invalidateQueries({ queryKey: ['pha-coverage-snapshot'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
    },
  });
}

export interface ReconcileResult {
  hud_total: number;
  our_total: number;
  active_hud: number;
  stale_hud: number;
  manual: number;
  unknown: number;
  rows_updated: number;
  checked_at: string;
}

export function useReconcileStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pha-reconcile-status');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Reconciliation failed');
      return data as ReconcileResult & { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pha-coverage-snapshot'] });
      qc.invalidateQueries({ queryKey: ['pha-registry-status-counts'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
    },
  });
}

export interface RegistryStatusCounts {
  active_hud: number;
  stale_hud: number;
  manual: number;
  unknown: number;
  archived: number;
  total: number;
}

export function useRegistryStatusCounts() {
  return useQuery({
    queryKey: ['pha-registry-status-counts'],
    queryFn: async (): Promise<RegistryStatusCounts> => {
      // Five lightweight head-only count queries
      const counts: RegistryStatusCounts = {
        active_hud: 0,
        stale_hud: 0,
        manual: 0,
        unknown: 0,
        archived: 0,
        total: 0,
      };
      const total = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true });
      counts.total = total.count ?? 0;
      const archived = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', true);
      counts.archived = archived.count ?? 0;
      for (const status of ['active_hud', 'stale_hud', 'manual', 'unknown'] as const) {
        const r = await supabase
          .from('housing_authorities')
          .select('id', { count: 'exact', head: true })
          .eq('registry_status', status)
          .eq('is_archived', false);
        counts[status] = r.count ?? 0;
      }
      return counts;
    },
    staleTime: 60_000,
  });
}

export interface StalePha {
  id: string;
  pha_code: string;
  name: string;
  city: string | null;
  state: string | null;
  is_archived: boolean;
}

export function useStalePhas(enabled: boolean) {
  return useQuery({
    queryKey: ['pha-stale-list'],
    enabled,
    queryFn: async (): Promise<StalePha[]> => {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('id, pha_code, name, city, state, is_archived')
        .eq('registry_status', 'stale_hud')
        .order('state', { ascending: true })
        .order('name', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as StalePha[];
    },
  });
}

export function useUpdatePhaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; registry_status?: string; is_archived?: boolean }) => {
      const patch: Record<string, any> = {};
      if (input.registry_status) patch.registry_status = input.registry_status;
      if (typeof input.is_archived === 'boolean') patch.is_archived = input.is_archived;
      const { error } = await supabase
        .from('housing_authorities')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pha-stale-list'] });
      qc.invalidateQueries({ queryKey: ['pha-registry-status-counts'] });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
    },
  });
}

export interface ManualPhaInput {
  pha_code: string;
  name: string;
  city?: string;
  state: string;
  zip?: string;
  phone?: string;
  email?: string;
  total_units?: number | null;
}

export function useAddPhaManually() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualPhaInput) => {
      const code = input.pha_code.trim().toUpperCase();
      if (!code) throw new Error('PHA code is required');
      if (!input.name?.trim()) throw new Error('Name is required');
      if (!input.state?.trim()) throw new Error('State is required');

      // Check duplicate
      const { data: existing } = await supabase
        .from('housing_authorities')
        .select('id, name')
        .eq('pha_code', code)
        .maybeSingle();
      if (existing) {
        throw new Error(`PHA code ${code} already exists: ${(existing as any).name}`);
      }

      const slug = `${input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${code.toLowerCase()}`.slice(0, 80);

      const { data, error } = await supabase
        .from('housing_authorities')
        .insert({
          pha_code: code,
          name: input.name.trim(),
          slug,
          city: input.city?.trim() || null,
          state: input.state.trim().toUpperCase(),
          zip: input.zip?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          is_onboarded: false,
          metadata: {
            zip: input.zip?.trim() || null,
            total_units: input.total_units ?? null,
            source: 'manual_admin_add',
            added_at: new Date().toISOString(),
          },
        })
        .select('id, pha_code, name')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      try {
        await supabase.functions.invoke('pha-coverage-check', { body: { force: true } });
      } catch {
        // non-fatal
      }
      qc.invalidateQueries({ queryKey: ['pha-coverage-snapshot'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
}
