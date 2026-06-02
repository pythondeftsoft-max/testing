import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineCard } from './usePipelineData';
import { slaFor } from './usePipelineData';

const PROCUREMENT_PATHS = [
  { value: 'sole_source', label: 'Sole-source justification' },
  { value: 'rfp', label: 'RFP response' },
  { value: 'piggyback', label: 'Piggyback / cooperative contract' },
  { value: 'mini_bid', label: 'Mini-bid (off cooperative)' },
  { value: 'direct', label: 'Direct purchase (under threshold)' },
];

const IT_REVIEW_STATES = ['not_started', 'in_review', 'approved', 'blocked'];
const DPA_STATES = ['not_started', 'sent', 'redlining', 'executed'];

interface Props {
  card: PipelineCard;
}

export function ProcurementPanel({ card }: Props) {
  const qc = useQueryClient();
  const table = card.source === 'lead' ? 'agency_leads' : 'pha_prospect_status';

  const [path, setPath] = useState(card.procurement_path ?? '');
  const [meta, setMeta] = useState<Record<string, any>>({});

  // Load current procurement_meta on mount
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from(table)
        .select('procurement_path, procurement_meta')
        .eq('id', card.id)
        .maybeSingle();
      if (data) {
        setPath(data.procurement_path ?? '');
        setMeta(data.procurement_meta ?? {});
      }
    })();
  }, [card.id, table]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from(table)
        .update({ procurement_path: path || null, procurement_meta: meta })
        .eq('id', card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Procurement details saved');
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Save failed'),
  });

  const sla = slaFor('procurement', card.deal_size);
  const setMetaField = (k: string, v: any) => setMeta((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Procurement tracking</h3>
          <p className="text-xs text-muted-foreground">
            Capture the path this PHA uses to buy. Drives the right next-action prompts.
          </p>
        </div>
        <div className="text-right text-xs">
          <Badge variant="outline" className="mb-1">
            {card.deal_size ?? 'unsized'} PHA
          </Badge>
          <div className="text-muted-foreground">SLA: {sla ?? '—'} days</div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Procurement path</Label>
        <Select value={path} onValueChange={setPath}>
          <SelectTrigger><SelectValue placeholder="Select path…" /></SelectTrigger>
          <SelectContent>
            {PROCUREMENT_PATHS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {path === 'rfp' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">RFP number</Label>
            <Input
              value={meta.rfp_number ?? ''}
              onChange={(e) => setMetaField('rfp_number', e.target.value)}
              placeholder="RFP #2026-001"
            />
          </div>
          <div>
            <Label className="text-xs">Response due date</Label>
            <Input
              type="date"
              value={meta.rfp_due_date ?? ''}
              onChange={(e) => setMetaField('rfp_due_date', e.target.value)}
            />
          </div>
        </div>
      )}

      {path === 'piggyback' && (
        <div>
          <Label className="text-xs">Piggyback contract reference</Label>
          <Input
            value={meta.piggyback_ref ?? ''}
            onChange={(e) => setMetaField('piggyback_ref', e.target.value)}
            placeholder="OMNIA #R-XXXX or HGAC #..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Board meeting date</Label>
          <Input
            type="date"
            value={meta.board_date ?? ''}
            onChange={(e) => setMetaField('board_date', e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Board approval status</Label>
          <Select
            value={meta.board_status ?? 'pending'}
            onValueChange={(v) => setMetaField('board_status', v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_required">Not required</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="on_agenda">On agenda</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">IT security review</Label>
          <Select
            value={meta.it_review ?? 'not_started'}
            onValueChange={(v) => setMetaField('it_review', v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IT_REVIEW_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">DPA / BAA status</Label>
          <Select
            value={meta.dpa_status ?? 'not_started'}
            onValueChange={(v) => setMetaField('dpa_status', v)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DPA_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Procurement notes</Label>
        <Textarea
          rows={3}
          value={meta.notes ?? ''}
          onChange={(e) => setMetaField('notes', e.target.value)}
          placeholder="Blockers, contacts, next steps…"
        />
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
        {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save procurement details
      </Button>
    </div>
  );
}
