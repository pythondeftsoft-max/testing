import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  PIPELINE_STAGES,
  STAGE_DEFINITIONS,
  type PipelineCard,
  type PipelineStage,
} from './usePipelineData';

interface Props {
  card: PipelineCard | null;
}

interface HistoryRow {
  id: string;
  deal_id: string;
  deal_source: string;
  stage: PipelineStage;
  fields: Record<string, any> | null;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
}

function labelForKey(stage: PipelineStage, key: string): string {
  const def = STAGE_DEFINITIONS[stage];
  if (!def) return key;
  const f = [...def.required, ...def.optional].find((x) => x.key === key);
  if (!f) return key.replace(/_/g, ' ');
  return f.label;
}

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export const DealStageHistoryTab: React.FC<Props> = ({ card }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['deal-stage-history', card?.source, card?.id],
    enabled: !!card,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_deal_stage_data')
        .select('*')
        .eq('deal_id', card!.id)
        .eq('deal_source', card!.source)
        .order('entered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    (data ?? []).forEach((r) => r.entered_by && ids.add(r.entered_by));
    return Array.from(ids);
  }, [data]);

  const { data: profiles } = useQuery({
    queryKey: ['deal-stage-history-profiles', userIds.sort().join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      const map: Record<string, { name: string; email: string | null }> = {};
      (data ?? []).forEach((p: any) => {
        map[p.user_id] = { name: p.display_name || p.email || 'Unknown', email: p.email };
      });
      return map;
    },
  });

  if (!card) return null;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading history…
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border rounded-md">
        <History className="inline h-4 w-4 mr-2" />
        No stage transitions captured yet. The next time you advance this deal, the captured info will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const stageLabel =
          PIPELINE_STAGES.find((s) => s.id === row.stage)?.label ?? row.stage;
        const who = row.entered_by
          ? profiles?.[row.entered_by]?.name ?? '—'
          : 'System';
        const when = (() => {
          try {
            return formatDistanceToNow(new Date(row.entered_at), { addSuffix: true });
          } catch {
            return new Date(row.entered_at).toLocaleString();
          }
        })();
        const fieldEntries = Object.entries(row.fields ?? {}).filter(
          ([, v]) => v !== null && v !== undefined && v !== ''
        );
        return (
          <div key={row.id} className="rounded-md border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge>{stageLabel}</Badge>
                <span className="text-xs text-muted-foreground">
                  by {who} • {when}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Date(row.entered_at).toLocaleString()}
              </span>
            </div>

            {fieldEntries.length > 0 && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1">
                {fieldEntries.map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {labelForKey(row.stage, k)}
                    </dt>
                    <dd className="font-medium break-words">{formatValue(v)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {row.notes && (
              <div className="pt-2 border-t">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Notes
                </div>
                <p className="text-xs whitespace-pre-wrap">{row.notes}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DealStageHistoryTab;
