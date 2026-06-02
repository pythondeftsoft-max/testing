import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, OctagonX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  itemId: string | null;
  onDone?: () => void;
}

const StopPaymentDialog: React.FC<Props> = ({ open, onOpenChange, itemId, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!itemId || !reason.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('stop-payment-disbursement', {
      body: { item_id: itemId, reason: reason.trim() },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(`Stop-payment failed: ${data?.error || error?.message || 'unknown'}`);
      return;
    }
    toast.success(`Stop-payment ${data.status} (${data.rail})`);
    setReason('');
    onDone?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><OctagonX className="w-4 h-4 text-destructive" /> Request Stop-Payment</DialogTitle>
          <DialogDescription>
            Checkbook lines are voided immediately. NACHA lines are flagged "stop requested" — you must also notify your originating bank to cancel before settlement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm">Reason</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Wrong amount, landlord requested cancel" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || !reason.trim()}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Stop-Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StopPaymentDialog;
