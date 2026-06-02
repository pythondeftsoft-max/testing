import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
  onVoided?: () => void;
}

export default function VoidLineDialog({ open, onOpenChange, itemId, itemDescription, onVoided }: Props) {
  const [reason, setReason] = useState('');
  const [reissue, setReissue] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Reason required'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('void-disbursement-line', {
      body: { item_id: itemId, reason, reissue },
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Void failed');
      return;
    }
    toast.success(reissue ? 'Voided + reissued' : 'Voided');
    setReason(''); setReissue(false);
    onOpenChange(false);
    onVoided?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Disbursement Line</DialogTitle>
          <DialogDescription>{itemDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason (required, audit-logged)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g., wrong amount, duplicate, landlord returned funds" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Reissue as new line</Label>
              <p className="text-xs text-muted-foreground">Creates a fresh pending line in the same batch.</p>
            </div>
            <Switch checked={reissue} onCheckedChange={setReissue} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Void {reissue && '+ Reissue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
