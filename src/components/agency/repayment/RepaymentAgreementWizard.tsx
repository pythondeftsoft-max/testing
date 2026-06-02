import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RecipientPicker from '../RecipientPicker';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onCreated: () => void;
}

const REASONS = [
  { value: 'unreported_income', label: 'Unreported Income' },
  { value: 'owed_rent', label: 'Owed Rent / Back Rent' },
  { value: 'damages', label: 'Tenant-Caused Damages' },
  { value: 'overpayment', label: 'HAP Overpayment Recovery' },
  { value: 'other', label: 'Other' },
];

const RepaymentAgreementWizard: React.FC<Props> = ({ open, onOpenChange, agencyId, onCreated }) => {
  const [tenantId, setTenantId] = useState('');
  const [originalDebt, setOriginalDebt] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('owed_rent');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const projectedMonths = useMemo(() => {
    const debt = parseFloat(originalDebt);
    const monthly = parseFloat(monthlyPayment);
    if (!debt || !monthly || monthly <= 0) return null;
    return Math.ceil(debt / monthly);
  }, [originalDebt, monthlyPayment]);

  const projectedEndDate = useMemo(() => {
    if (!projectedMonths || !startDate) return null;
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + projectedMonths);
    return d.toISOString().slice(0, 10);
  }, [projectedMonths, startDate]);

  const handleSave = async () => {
    if (!tenantId) return toast.error('Select a tenant');
    const debt = parseFloat(originalDebt);
    const monthly = parseFloat(monthlyPayment);
    if (!debt || debt <= 0) return toast.error('Enter original debt');
    if (!monthly || monthly <= 0) return toast.error('Enter monthly payment');

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('agency_repayment_agreements').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      original_debt: debt,
      monthly_payment: monthly,
      balance_remaining: debt,
      start_date: startDate,
      end_date: projectedEndDate,
      status: 'active',
      reason,
      notes: notes || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success('Repayment agreement created');
    onCreated();
    onOpenChange(false);
    setTenantId(''); setOriginalDebt(''); setMonthlyPayment(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Repayment Agreement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tenant</Label>
            <RecipientPicker
              agencyId={agencyId}
              value={tenantId}
              onChange={(r) => setTenantId(r?.id || '')}
              type="tenant"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Original Debt ($)</Label>
              <Input type="number" step="0.01" min="0" value={originalDebt} onChange={e => setOriginalDebt(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Monthly Payment ($)</Label>
              <Input type="number" step="0.01" min="0" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {projectedMonths && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Projected term: {projectedMonths} months</p>
              <p className="text-xs text-muted-foreground">Ends approximately {projectedEndDate}</p>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional context, reference to hearing decision, etc." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepaymentAgreementWizard;
