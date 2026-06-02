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

const InitiatePortOutDialog: React.FC<Props> = ({ open, onOpenChange, agencyId, agencyName, agencyPhaCode, onCreated }) => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [voucherId, setVoucherId] = useState<string>('');
  const [receivingAgencyId, setReceivingAgencyId] = useState<string>('');
  const [issuanceDate, setIssuanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: vs }, { data: ags }] = await Promise.all([
        supabase.from('agency_vouchers').select('id, voucher_number, tenant_id, bedroom_size').eq('agency_id', agencyId).in('status', ['active', 'pending']).order('created_at', { ascending: false }).limit(500),
        supabase.from('housing_authorities').select('id, name, pha_code').neq('id', agencyId).order('name').limit(2000),
      ]);
      setVouchers(vs || []);
      setAgencies(ags || []);
    })();
  }, [open, agencyId]);

  const submit = async () => {
    if (!receivingAgencyId) { toast.error('Receiving PHA required'); return; }
    setSaving(true);
    const voucher = vouchers.find(v => v.id === voucherId);
    const receiving = agencies.find(a => a.id === receivingAgencyId);
    const issuance = new Date(issuanceDate);
    const searchExp = new Date(issuance); searchExp.setDate(searchExp.getDate() + 60);
    const user = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from('agency_portability_requests').insert({
      agency_id: agencyId,
      request_type: 'port_out',
      status: 'initiated',
      tenant_id: voucher?.tenant_id || null,
      voucher_id: voucherId || null,
      bedroom_size: voucher?.bedroom_size || null,
      initial_pha_id: agencyId,
      initial_pha_name: agencyName,
      initial_pha_code: agencyPhaCode || null,
      receiving_pha_id: receivingAgencyId,
      receiving_pha_name: receiving?.name || null,
      receiving_pha_code: receiving?.pha_code || null,
      voucher_issuance_date: issuanceDate,
      search_expiration_date: searchExp.toISOString().slice(0, 10),
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      notes: notes || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Port-out initiated');
    onCreated();
    onOpenChange(false);
    setVoucherId(''); setReceivingAgencyId(''); setContactName(''); setContactEmail(''); setContactPhone(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Initiate Port-Out</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Voucher Holder (optional)</Label>
            <Select value={voucherId} onValueChange={setVoucherId}>
              <SelectTrigger><SelectValue placeholder="Select voucher" /></SelectTrigger>
              <SelectContent>{vouchers.map(v => <SelectItem key={v.id} value={v.id}>{v.voucher_number || v.id.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Receiving PHA *</Label>
            <Select value={receivingAgencyId} onValueChange={setReceivingAgencyId}>
              <SelectTrigger><SelectValue placeholder="Select receiving housing authority" /></SelectTrigger>
              <SelectContent>{agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}{a.pha_code ? ` (${a.pha_code})` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Voucher Issuance Date</Label>
            <Input type="date" value={issuanceDate} onChange={e => setIssuanceDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">60-day search clock auto-calculated</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact Name</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></div>
          </div>
          <div><Label>Contact Email</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !receivingAgencyId}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Initiate Port-Out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InitiatePortOutDialog;
