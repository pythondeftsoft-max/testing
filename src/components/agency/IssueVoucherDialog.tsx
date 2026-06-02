import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import RecipientPicker from './RecipientPicker';

interface IssueVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onIssued: (voucher: any) => void;
}

const VOUCHER_TYPES = [
  { value: 'HCV', label: 'Housing Choice Voucher (HCV)' },
  { value: 'project_based', label: 'Project-Based' },
  { value: 'VASH', label: 'VASH (Veterans)' },
  { value: 'emergency', label: 'Emergency Housing Voucher' },
  { value: 'FUP', label: 'Family Unification Program' },
  { value: 'other', label: 'Other' },
];

const IssueVoucherDialog: React.FC<IssueVoucherDialogProps> = ({ open, onOpenChange, agencyId, onIssued }) => {
  const [tenantId, setTenantId] = useState('');
  const [voucherType, setVoucherType] = useState('HCV');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    if (!tenantId.trim()) { toast.error('Please select a tenant'); return; }
    setIssuing(true);

    const voucher = {
      agency_id: agencyId,
      tenant_id: tenantId.trim(),
      voucher_type: voucherType,
      voucher_number: voucherNumber.trim() || null,
      amount: amount ? parseFloat(amount) : null,
      expires_at: expiresAt || null,
      issued_at: new Date().toISOString(),
      status: 'active',
      notes: notes.trim() || null,
    };

    onIssued(voucher);
    setIssuing(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTenantId('');
    setVoucherType('HCV');
    setVoucherNumber('');
    setAmount('');
    setExpiresAt('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue New Voucher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant *</Label>
            <RecipientPicker
              type="tenant"
              agencyId={agencyId}
              value={tenantId || null}
              onChange={(r) => setTenantId(r?.id || '')}
              placeholder="Search tenants..."
            />
          </div>
          <div>
            <Label>Voucher Type</Label>
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOUCHER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Voucher Number (optional)</Label><Input value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Amount ($)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><Label>Expires</Label><Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleIssue} disabled={issuing}>
            {issuing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Issuing...</> : 'Issue Voucher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IssueVoucherDialog;
