import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  inspectionId: string;
  inspectorUserId: string;
  onDeclined?: () => void;
}

const REASONS = [
  { value: 'sick', label: 'Out sick' },
  { value: 'conflict', label: 'Conflict of interest' },
  { value: 'wrong_territory', label: 'Wrong territory' },
  { value: 'double_booked', label: 'Double-booked' },
  { value: 'other', label: 'Other' },
];

const DeclineInspectionDialog: React.FC<Props> = ({ open, onOpenChange, inspectionId, inspectorUserId, onDeclined }) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDecline = async () => {
    if (!reason) { toast.error('Select a reason'); return; }
    setSubmitting(true);
    const fullReason = notes ? `${reason}: ${notes}` : reason;
    const { error } = await supabase
      .from('inspections')
      .update({
        inspector_id: null,
        declined_by: inspectorUserId,
        decline_reason: fullReason,
        declined_at: new Date().toISOString(),
        status: 'requested',
        assignment_mode: null,
      } as any)
      .eq('id', inspectionId);
    setSubmitting(false);
    if (error) { toast.error('Failed to decline'); return; }
    toast.success('Inspection sent back to queue');
    onDeclined?.();
    onOpenChange(false);
    setReason(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this inspection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">It will return to the unassigned queue. Your supervisor will be notified.</p>
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra context for the supervisor" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDecline} disabled={submitting}>Decline</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclineInspectionDialog;
