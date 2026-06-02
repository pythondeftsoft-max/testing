import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  STAGE_DEFINITIONS, PIPELINE_STAGES, stageToLeadStatus, stageToProspectStatus,
  type PipelineStage, type StageField, type PipelineCard,
} from './usePipelineData';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card: PipelineCard | null;
  toStage: PipelineStage;
  onAdvanced?: () => void;
}

function FieldInput({ field, value, onChange }: { field: StageField; value: any; onChange: (v: any) => void }) {
  if (field.type === 'textarea') {
    return <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} />;
  }
  if (field.type === 'select') {
    return (
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
        <SelectContent>
          {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-2 h-10">
        <Switch checked={!!value} onCheckedChange={onChange} />
        <span className="text-xs text-muted-foreground">{value ? 'Yes' : 'No'}</span>
      </div>
    );
  }
  if (field.type === 'date') {
    return <Input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === 'number' || field.type === 'currency') {
    return <Input type="number" step={field.type === 'currency' ? '0.01' : '1'} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder={field.placeholder} />;
  }
  return <Input type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
}

export const AdvanceStageDialog: React.FC<Props> = ({ open, onOpenChange, card, toStage, onAdvanced }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const def = STAGE_DEFINITIONS[toStage];
  const stageLabel = useMemo(() => PIPELINE_STAGES.find((s) => s.id === toStage)?.label ?? toStage, [toStage]);
  const fromLabel = useMemo(() => PIPELINE_STAGES.find((s) => s.id === card?.stage)?.label ?? card?.stage, [card]);

  // Reset on open + apply defaults
  React.useEffect(() => {
    if (open && def) {
      const initial: Record<string, any> = {};
      [...def.required, ...def.optional].forEach((f) => {
        if (f.defaultValue !== undefined) initial[f.key] = f.defaultValue;
      });
      setFields(initial);
      setNotes('');
    }
  }, [open, toStage, card?.id, def]);

  const visibleRequired = useMemo(() => {
    if (!def) return [];
    return def.required.filter((f) => !f.showWhen || f.showWhen(fields));
  }, [def, fields]);

  const visibleOptional = useMemo(() => {
    if (!def) return [];
    return def.optional.filter((f) => !f.showWhen || f.showWhen(fields));
  }, [def, fields]);

  const missingRequired = useMemo(() => {
    return visibleRequired.filter((f) => {
      const v = fields[f.key];
      if (f.type === 'boolean') return v === undefined || v === null;
      return v === undefined || v === null || v === '';
    });
  }, [visibleRequired, fields]);

  const save = async () => {
    if (!card || !def) return;
    if (missingRequired.length > 0) {
      toast({ title: 'Required fields missing', description: missingRequired.map((f) => f.label).join(', '), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: histErr } = await (supabase as any).from('agency_deal_stage_data').insert({
        deal_id: card.id,
        deal_source: card.source,
        stage: toStage,
        fields,
        notes: notes.trim() || null,
        entered_by: user?.id,
      });
      if (histErr) throw histErr;

      const table = card.source === 'lead' ? 'agency_leads' : 'pha_prospect_status';
      const newStatus = card.source === 'lead' ? stageToLeadStatus(toStage) : stageToProspectStatus(toStage);
      const update: any = {
        status: newStatus,
        last_stage_change_at: new Date().toISOString(),
      };
      if (toStage === 'lost') {
        if (fields.lost_reason) update.lost_reason = fields.lost_reason;
        if (fields.lost_competitor) update.lost_competitor = fields.lost_competitor;
        if (fields.revisit_at) update.revisit_at = fields.revisit_at;
      }
      if (toStage === 'dormant') {
        if (fields.revisit_at) update.revisit_at = fields.revisit_at;
      }
      const { error: updErr } = await supabase.from(table as any).update(update).eq('id', card.id);
      if (updErr) throw updErr;

      toast({ title: `Advanced to ${stageLabel}` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      qc.invalidateQueries({ queryKey: ['deal-stage-history', card.source, card.id] });
      onAdvanced?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Failed to advance', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!card || !def) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{fromLabel}</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge>{stageLabel}</Badge>
          </div>
          <DialogTitle className="text-base font-semibold mt-1">{card.agency_name}</DialogTitle>
          <DialogDescription className="text-xs">{def.definition}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {visibleRequired.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {visibleRequired.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label} <span className="text-destructive">*</span></Label>
                    <FieldInput field={f} value={fields[f.key]} onChange={(v) => setFields((p) => ({ ...p, [f.key]: v }))} />
                    {f.helpText && <p className="text-[11px] text-muted-foreground">{f.helpText}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleOptional.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optional — fill what you have</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {visibleOptional.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <FieldInput field={f} value={fields[f.key]} onChange={(v) => setFields((p) => ({ ...p, [f.key]: v }))} />
                    {f.helpText && <p className="text-[11px] text-muted-foreground">{f.helpText}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 pt-3 border-t">
            <Label className="text-xs">Notes (always optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else to capture about this stage move…" rows={3} />
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-muted/30 flex-row sm:justify-between items-center gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 min-h-[1rem]">
            {missingRequired.length > 0 && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Missing: {missingRequired.map((f) => f.label).join(', ')}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || missingRequired.length > 0}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Advance to {stageLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdvanceStageDialog;
