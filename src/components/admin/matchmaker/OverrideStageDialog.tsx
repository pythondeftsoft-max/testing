import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminOverrideStage } from '@/hooks/useAdminManualPipeline';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityType: 'tenant' | 'unit';
  entityId: string;
  currentStage?: string | null;
}

const UNIT_STAGES = [
  'unassigned', 'available', 'matched', 'in_process',
  'lease_signed', 'filled_awaiting_payment', 'paid_housed',
];

const TENANT_STAGES = [
  'new_lead', 'application_started', 'matched', 'in_process',
  'approved_awaiting', 'lease_signed', 'housed_paid',
];

export const OverrideStageDialog: React.FC<Props> = ({
  open, onOpenChange, entityType, entityId, currentStage,
}) => {
  const [stage, setStage] = useState<string>('');
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useAdminOverrideStage();

  const stages = entityType === 'unit' ? UNIT_STAGES : TENANT_STAGES;

  const submit = () => {
    if (!stage || reason.trim().length < 3) return;
    mutate(
      { entityType, entityId, targetStage: stage, reason },
      { onSuccess: () => { onOpenChange(false); setStage(''); setReason(''); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Override pipeline stage</DialogTitle>
          <DialogDescription>
            Manually set the {entityType} to a specific stage. Current: <strong>{currentStage || 'unknown'}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>New stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Pick a stage…" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason (required)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Why is this manual override needed?" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!stage || reason.trim().length < 3 || isPending}>
            {isPending ? 'Saving…' : 'Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OverrideStageDialog;
