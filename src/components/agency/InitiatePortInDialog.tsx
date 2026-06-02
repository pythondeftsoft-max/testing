import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  agencyName: string;
  agencyPhaCode?: string | null;
  onCreated: () => void;
}

const InitiatePortInDialog: React.FC<Props> = ({ open, onOpenChange, agencyId, agencyName, agencyPhaCode, onCreated }) => {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [initialAgencyId, setInitialAgencyId] = useState<string>('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [bedroomSize, setBedroomSize] = useState<string>('');
  const [hapAmount, setHapAmount] = useState<string>('');
  const [issuanceDate, setIssuanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [billingArrangement, setBillingArrangement] = useState<string>('billed');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from('housing_authorities').select('id, name, pha_code').neq('id', agencyId).order('name').limit(2000);
      setAgencies(data || []);
    })();
  }, [open, agencyId]);

  const submit = async () => {
    if (!initialAgencyId) { toast.error('Initial PHA required'); return; }
    setSaving(true);
    const initial = agencies.find(a => a.id === initialAgencyId);
    const issuance = new Date(issuanceDate);
    const searchExp = new Date(issuance); searchExp.setDate(searchExp.getDate() + 60);
    const user = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from('agency_portability_requests').insert({
      agency_id: agencyId,
      request_type: 'port_in',
      status: 'paperwork_received',
      billing_arrangement: billingArrangement,
      initial_pha_id: initialAgencyId,
      initial_pha_name: initial?.name || null,
      initial_pha_code: initial?.pha_code || null,
      receiving_pha_id: agencyId,
      receiving_pha_name: agencyName,
      receiving_pha_code: agencyPhaCode || null,
      voucher_issuance_date: issuanceDate,
      search_expiration_date: searchExp.toISOString().slice(0, 10),
      bedroom_size: bedroomSize ? parseInt(bedroomSize) : null,
      hap_amount: hapAmount ? parseFloat(hapAmount) : null,
      contact_name: tenantName || null,
      contact_email: tenantEmail || null,
      contact_phone: tenantPhone || null,
      notes: notes || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Port-in record created');
    onCreated();
    onOpenChange(false);
    setInitialAgencyId(''); setTenantName(''); setTenantEmail(''); setTenantPhone(''); setBedroomSize(''); setHapAmount(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Receive Port-In</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Initial (Sending) PHA *</Label>
            <Select value={initialAgencyId} onValueChange={setInitialAgencyId}>
              <SelectTrigger><SelectValue placeholder="Select sending housing authority" /></SelectTrigger>
              <SelectContent>{agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}{a.pha_code ? ` (${a.pha_code})` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Billing Arrangement *</Label>
            <Select value={billingArrangement} onValueChange={setBillingArrangement}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="billed">Bill initial PHA monthly</SelectItem>
                <SelectItem value="absorbed">Absorb into our voucher count</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tenant Name</Label><Input value={tenantName} onChange={e => setTenantName(e.target.value)} /></div>
            <div><Label>Tenant Phone</Label><Input value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} /></div>
          </div>
          <div><Label>Tenant Email</Label><Input type="email" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Bedrooms</Label><Input type="number" value={bedroomSize} onChange={e => setBedroomSize(e.target.value)} /></div>
            <div className="col-span-2"><Label>HAP Amount</Label><Input type="number" step="0.01" value={hapAmount} onChange={e => setHapAmount(e.target.value)} /></div>
          </div>
          <div>
            <Label>Voucher Issuance Date</Label>
            <Input type="date" value={issuanceDate} onChange={e => setIssuanceDate(e.target.value)} />
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !initialAgencyId}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Create Port-In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InitiatePortInDialog;
