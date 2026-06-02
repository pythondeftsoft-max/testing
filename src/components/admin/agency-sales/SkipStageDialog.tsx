import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, SkipForward } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source: 'lead' | 'prospect';
  recordId: string;
  fromStage: string;
  toStage: string;
  onSkipped?: () => void;
}

export const SkipStageDialog: React.FC<Props> = ({
  open, onOpenChange, source, recordId, fromStage, toStage, onSkipped,
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const skip = async () => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const table = source === 'lead' ? 'agency_leads' : 'lead_prospects';

      // 1. Read current metadata + skipped stages
      const { data: row } = await supabase.from(table).select('metadata').eq('id', recordId).maybeSingle() as any;
      const meta = (row?.metadata as any) || {};
      const skipped = Array.isArray(meta.skipped_stages) ? meta.skipped_stages : [];
      skipped.push({ stage: fromStage, reason: reason.trim(), at: new Date().toISOString() });

      const updates: any = {
        metadata: { ...meta, skipped_stages: skipped },
      };
      if (source === 'lead') updates.status = toStage;
      else updates.stage = toStage;

      const { error } = await supabase.from(table).update(updates).eq('id', recordId);
      if (error) throw error;

      // 2. Log activity
      if (source === 'lead') {
        await supabase.from('agency_lead_activities').insert({
          lead_id: recordId,
          actor_id: user?.id,
          activity_type: 'stage_skipped',
          description: `Skipped ${fromStage} → ${toStage}: ${reason.trim()}`,
          metadata: { from: fromStage, to: toStage, reason: reason.trim() },
        });
      } else {
        await supabase.from('pha_prospect_notes').insert({
          prospect_id: recordId,
          author_user_id: user?.id,
          note: `Skipped ${fromStage} → ${toStage}: ${reason.trim()}`,
          kind: 'stage_skipped',
          metadata: { from: fromStage, to: toStage },
        });
      }

      toast({ title: `Skipped to ${toStage}` });
      qc.invalidateQueries({ queryKey: ['pipeline-cards'] });
      qc.invalidateQueries({ queryKey: ['deal-notes'] });
      onSkipped?.();
      onOpenChange(false);
      setReason('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SkipForward className="h-4 w-4" /> Skip stage
          </DialogTitle>
          <DialogDescription>
            Move from <strong>{fromStage}</strong> to <strong>{toStage}</strong>. Reason is required so the
            timeline shows why we leapfrogged this step.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., PHA already issued an RFP — skipping demo and going straight to proposal."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={skip} disabled={saving || !reason.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Skip & advance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SkipStageDialog;
