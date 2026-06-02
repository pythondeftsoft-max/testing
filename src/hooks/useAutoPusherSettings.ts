import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AutoPusherMode = 'suggest_only' | 'auto_hot' | 'auto_hot_decent';

export interface AutoPusherSettings {
  id: string;
  master_enabled: boolean;
  mode: AutoPusherMode;
  score_floor: number;
  daily_cap_total: number;
  daily_cap_per_tenant: number;
  cooldown_days: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  dry_run: boolean;
  updated_at: string;
}

export const useAutoPusherSettings = () => {
  return useQuery({
    queryKey: ['auto-pusher-settings'],
    queryFn: async (): Promise<AutoPusherSettings | null> => {
      const { data, error } = await supabase
        .from('auto_pusher_settings')
        .select('*')
        .eq('singleton', true)
        .maybeSingle();
      if (error) throw error;
      return data as AutoPusherSettings | null;
    },
  });
};

export const useUpdateAutoPusherSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AutoPusherSettings>) => {
      const { data, error } = await supabase
        .from('auto_pusher_settings')
        .update(patch)
        .eq('singleton', true)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-pusher-settings'] });
      toast.success('Auto-pusher settings saved');
    },
    onError: (e: any) => {
      toast.error('Failed to save', { description: e.message });
    },
  });
};

export interface AutoPusherTerritory {
  id: string;
  state: string | null;
  city: string | null;
  housing_authority_id: string | null;
  label: string | null;
  enabled: boolean;
  created_at: string;
}

export const useAutoPusherTerritories = () => {
  return useQuery({
    queryKey: ['auto-pusher-territories'],
    queryFn: async (): Promise<AutoPusherTerritory[]> => {
      const { data, error } = await supabase
        .from('auto_pusher_territories')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AutoPusherTerritory[];
    },
  });
};

export const useAddTerritory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      state?: string | null;
      city?: string | null;
      housing_authority_id?: string | null;
      label?: string;
    }) => {
      const { data, error } = await supabase
        .from('auto_pusher_territories')
        .insert({
          state: input.state || null,
          city: input.city || null,
          housing_authority_id: input.housing_authority_id || null,
          label: input.label || null,
          enabled: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-pusher-territories'] });
      toast.success('Territory added');
    },
    onError: (e: any) => toast.error('Failed', { description: e.message }),
  });
};

export const useToggleTerritory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('auto_pusher_territories')
        .update({ enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auto-pusher-territories'] }),
  });
};

export const useDeleteTerritory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_pusher_territories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-pusher-territories'] });
      toast.success('Territory removed');
    },
  });
};
