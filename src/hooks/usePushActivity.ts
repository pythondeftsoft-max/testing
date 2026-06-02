import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface PushActivityRow {
  id: string;
  tenant_id: string;
  property_id: string | null;
  unit_id: string | null;
  push_type: string | null;
  status: string | null;
  notes: string | null;
  pushed_at: string | null;
  created_at: string;
  interested_at: string | null;
  sms_conversation_id: string | null;
  sms_message_id: string | null;
  // joins
  tenant_name?: string;
  tenant_phone?: string;
  property_address?: string;
  unit_label?: string;
  unit_rent?: number | null;
  unit_beds?: number | null;
}

export interface SuggestedPushRow {
  id: string;
  tenant_id: string;
  unit_id: string;
  property_id: string | null;
  score: number;
  tier: string | null;
  reasoning: any;
  status: string;
  created_at: string;
  tenant_name?: string;
  property_address?: string;
  unit_label?: string;
  unit_rent?: number | null;
  unit_beds?: number | null;
}

const sinceIso = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();

async function enrichPushes(rows: any[]): Promise<PushActivityRow[]> {
  if (!rows.length) return [];
  const tenantIds = [...new Set(rows.map((r) => r.tenant_id).filter(Boolean))];
  const unitIds = [...new Set(rows.map((r) => r.unit_id).filter(Boolean))];

  const [profilesRes, unitsRes] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, phone').in('id', tenantIds),
    supabase
      .from('property_units')
      .select('id, unit_number, bedrooms, monthly_rent, properties:property_id(address, city, state)')
      .in('id', unitIds),
  ]);

  const tMap = new Map<string, any>(((profilesRes.data as any[]) || []).map((t) => [t.id, t]));
  const uMap = new Map<string, any>(((unitsRes.data as any[]) || []).map((u) => [u.id, u]));

  return rows.map((r) => {
    const t = tMap.get(r.tenant_id);
    const u = uMap.get(r.unit_id);
    const prop: any = u?.properties;
    return {
      ...r,
      tenant_name: t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Unknown',
      tenant_phone: t?.phone ?? null,
      property_address: prop ? `${prop.address}, ${prop.city}, ${prop.state}` : '—',
      unit_label: u?.unit_number ? `Unit ${u.unit_number}` : 'Unit',
      unit_rent: u?.monthly_rent ?? null,
      unit_beds: u?.bedrooms ?? null,
    } as PushActivityRow;
  });
}

export const useLivePushes = () => {
  return useQuery({
    queryKey: ['push-activity', 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_pushes')
        .select('*')
        .gte('created_at', sinceIso(30))
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return enrichPushes(data || []);
    },
    staleTime: 30_000,
  });
};

export const useInterestedPushes = () => {
  return useQuery({
    queryKey: ['push-activity', 'interested'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_pushes')
        .select('*')
        .eq('status', 'tenant_interested')
        .order('interested_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return enrichPushes(data || []);
    },
    staleTime: 15_000,
  });
};

export const useSuggestedPushes = () => {
  return useQuery({
    queryKey: ['push-activity', 'suggested'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suggested_pushes')
        .select('*')
        .eq('status', 'pending')
        .order('score', { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = data || [];
      const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
      const unitIds = [...new Set(rows.map((r) => r.unit_id))];
      const [profilesRes, unitsRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds),
        supabase
          .from('property_units')
          .select('id, unit_number, bedrooms, monthly_rent, properties:property_id(address, city, state)')
          .in('id', unitIds),
      ]);
      const tMap = new Map<string, any>(((profilesRes.data as any[]) || []).map((t) => [t.id, t]));
      const uMap = new Map<string, any>(((unitsRes.data as any[]) || []).map((u) => [u.id, u]));
      return rows.map((r) => {
        const t = tMap.get(r.tenant_id);
        const u = uMap.get(r.unit_id);
        const prop: any = u?.properties;
        return {
          ...r,
          tenant_name: t ? `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() : 'Unknown',
          property_address: prop ? `${prop.address}, ${prop.city}, ${prop.state}` : '—',
          unit_label: u?.unit_number ? `Unit ${u.unit_number}` : 'Unit',
          unit_rent: u?.monthly_rent ?? null,
          unit_beds: u?.bedrooms ?? null,
        } as SuggestedPushRow;
      });
    },
    staleTime: 30_000,
  });
};

export const useSuggestedPushAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('suggested-push-action', {
        body: { suggestion_id: id, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'approve' ? 'Push approved & sent' : 'Suggestion rejected');
      qc.invalidateQueries({ queryKey: ['push-activity'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Action failed'),
  });
};

export const useNotifyTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (push_id: string) => {
      const { data, error } = await supabase.functions.invoke('push-notify-tenant', {
        body: { push_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Quo SMS sent to tenant');
      qc.invalidateQueries({ queryKey: ['push-activity'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to send SMS'),
  });
};

// Realtime: invalidate on changes to property_pushes / suggested_pushes
export const usePushActivityRealtime = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel('push-activity-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_pushes' }, () => {
        qc.invalidateQueries({ queryKey: ['push-activity'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggested_pushes' }, () => {
        qc.invalidateQueries({ queryKey: ['push-activity'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
};
