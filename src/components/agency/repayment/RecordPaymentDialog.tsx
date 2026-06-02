import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: string;
  balanceRemaining: number;
  monthlyPayment: number;
  onRecorded: () => void;
}

const RecordPaymentDialog: React.FC<Props> = ({ open, onOpenChange, agreementId, balanceRemaining, monthlyPayment, onRecorded }) => {
  const [amount, setAmount] = useState(String(monthlyPayment));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('agency_repayment_payments').insert({
      agreement_id: agreementId,
      amount: amt,
      payment_date: paymentDate,
      notes: notes || null,
      recorded_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Payment recorded');
    onRecorded();
    onOpenChange(false);
    setAmount(String(monthlyPayment)); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>Outstanding balance: <span className="font-mono font-semibold">${balanceRemaining.toFixed(2)}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Method, reference number, etc." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
