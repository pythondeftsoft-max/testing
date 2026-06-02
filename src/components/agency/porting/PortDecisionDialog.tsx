import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packetId: string;
  onSaved?: () => void;
}

const PortDecisionDialog: React.FC<Props> = ({ open, onOpenChange, packetId, onSaved }) => {
  const [decision, setDecision] = useState<'absorbed' | 'billed' | 'denied'>('absorbed');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('agency_port_packets')
      .update({
        decision,
        decision_at: new Date().toISOString(),
        decision_by: user?.id,
        decision_notes: notes || null,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', packetId);
    setLoading(false);
    if (error) { toast.error('Failed to record decision'); return; }
    toast.success(`Port ${decision}`);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Absorb-vs-Bill Decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={decision} onValueChange={(v: any) => setDecision(v)}>
            <div className="flex items-start gap-3 p-3 border rounded-md">
              <RadioGroupItem value="absorbed" id="absorbed" className="mt-1" />
              <Label htmlFor="absorbed" className="flex-1 cursor-pointer">
                <div className="font-medium">Absorb</div>
                <div className="text-sm text-muted-foreground">Take the voucher into our roster. We pay HAP from our funding. Counts toward SEMAP indicator 8.</div>
              </Label>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-md">
              <RadioGroupItem value="billed" id="billed" className="mt-1" />
              <Label htmlFor="billed" className="flex-1 cursor-pointer">
                <div className="font-medium">Bill</div>
                <div className="text-sm text-muted-foreground">Administer the voucher locally and bill the issuing PHA monthly for HAP + 80% admin fee.</div>
              </Label>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-md">
              <RadioGroupItem value="denied" id="denied" className="mt-1" />
              <Label htmlFor="denied" className="flex-1 cursor-pointer">
                <div className="font-medium">Deny</div>
                <div className="text-sm text-muted-foreground">Reject the port (e.g., insufficient funding, eligibility issue). Reason required.</div>
              </Label>
            </div>
          </RadioGroup>
          <div>
            <Label>Decision Notes {decision === 'denied' && <span className="text-destructive">*</span>}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={decision === 'denied' ? 'Required: reason for denial' : 'Optional notes'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || (decision === 'denied' && !notes)}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Record Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PortDecisionDialog;
