import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminSetPrimaryAndAdvance } from '@/hooks/useAdminManualPipeline';
import { PushStatusBadge } from './SubStageBadge';

export interface PushOption {
  id: string;
  tenant_id: string;
  tenant_name: string;
  status: string;
  pushed_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string;
  unitLabel?: string;
  pushes: PushOption[];
  targetStage: 'in_process' | 'lease_signed' | 'housed_paid';
}

const stageLabel = (s: Props['targetStage']) =>
  s === 'in_process' ? 'In Progress'
    : s === 'lease_signed' ? 'Lease Signed (Awaiting Payment)'
    : 'Housed & Paid';

export const SelectPrimaryMatchDialog: React.FC<Props> = ({
  open, onOpenChange, unitId, unitLabel, pushes, targetStage,
}) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const [demote, setDemote] = useState(false);
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useAdminSetPrimaryAndAdvance();

  const submit = () => {
    if (!chosen) return;
    mutate(
      { unitId, tenantId: chosen, targetStage, demoteOthers: demote, reason },
      { onSuccess: () => { onOpenChange(false); setChosen(null); setReason(''); setDemote(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick the primary match</DialogTitle>
          <DialogDescription>
            {unitLabel || 'This unit'} has {pushes.length} active pushes. Choose which tenant
            advances to <strong>{stageLabel(targetStage)}</strong>. Other tenants stay as backups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {pushes.map((p) => {
            const sel = chosen === p.tenant_id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setChosen(p.tenant_id)}
                className={`w-full text-left border rounded-md p-3 hover:bg-muted ${sel ? 'border-primary bg-muted' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{p.tenant_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Pushed {new Date(p.pushed_at).toLocaleDateString()}
                    </div>
                  </div>
                  <PushStatusBadge status={p.status} size="sm" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox id="demote" checked={demote} onCheckedChange={(v) => setDemote(!!v)} />
          <Label htmlFor="demote" className="font-normal text-sm cursor-pointer">
            Also unsend the other pushes (default: keep them as backups)
          </Label>
        </div>

        <div>
          <Label>Reason (optional)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!chosen || isPending}>
            {isPending ? 'Advancing…' : `Advance to ${stageLabel(targetStage)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectPrimaryMatchDialog;
