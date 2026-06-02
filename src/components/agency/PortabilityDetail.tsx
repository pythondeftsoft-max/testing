import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, Calendar, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import PortabilityBillingTable from './PortabilityBillingTable';

interface Props {
  portabilityId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = ['initiated', 'paperwork_sent', 'paperwork_received', 'searching', 'leased', 'absorbed', 'billed', 'returned', 'expired', 'cancelled'];

const statusColor: Record<string, string> = {
  initiated: 'bg-yellow-100 text-yellow-800',
  paperwork_sent: 'bg-blue-100 text-blue-800',
  paperwork_received: 'bg-blue-100 text-blue-800',
  searching: 'bg-orange-100 text-orange-800',
  leased: 'bg-green-100 text-green-800',
  absorbed: 'bg-purple-100 text-purple-800',
  billed: 'bg-indigo-100 text-indigo-800',
  returned: 'bg-muted',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-muted',
};

const PortabilityDetail: React.FC<Props> = ({ portabilityId, open, onOpenChange, onUpdated }) => {
  const [record, setRecord] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('agency_portability_requests').select('*').eq('id', portabilityId).single();
    setRecord(data);
    setNotes(data?.notes || '');
    setInternalNotes(data?.internal_notes || '');
  };

  useEffect(() => { if (open) load(); }, [open, portabilityId]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    const { error } = await supabase.from('agency_portability_requests').update({ status }).eq('id', portabilityId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${status}`);
    load(); onUpdated();
  };

  const updateBilling = async (arrangement: string) => {
    const { error } = await supabase.from('agency_portability_requests').update({ billing_arrangement: arrangement }).eq('id', portabilityId);
    if (error) { toast.error(error.message); return; }
    toast.success('Billing arrangement updated');
    load(); onUpdated();
  };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from('agency_portability_requests').update({ notes, internal_notes: internalNotes }).eq('id', portabilityId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Notes saved');
  };

  if (!record) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div></DialogContent>
      </Dialog>
    );
  }

  const isPortIn = record.request_type === 'port_in';
  const daysRemaining = record.search_expiration_date ? Math.ceil((new Date(record.search_expiration_date).getTime() - Date.now()) / 86400000) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            {isPortIn ? 'Port-In' : 'Port-Out'}: {record.contact_name || 'Unnamed'}
            <Badge className={statusColor[record.status]}>{record.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Route */}
          <Card>
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Initial PHA</p>
                <p className="font-semibold">{record.initial_pha_name || '—'}</p>
                {record.initial_pha_code && <p className="text-xs text-muted-foreground">{record.initial_pha_code}</p>}
              </div>
              <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Receiving PHA</p>
                <p className="font-semibold">{record.receiving_pha_name || '—'}</p>
                {record.receiving_pha_code && <p className="text-xs text-muted-foreground">{record.receiving_pha_code}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Status + Billing */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
              <CardContent>
                <Select value={record.status} onValueChange={updateStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Billing Arrangement</CardTitle></CardHeader>
              <CardContent>
                <Select value={record.billing_arrangement || ''} onValueChange={updateBilling}>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billed">Billed monthly</SelectItem>
                    <SelectItem value="absorbed">Absorbed</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Dates + Contact */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Issued:</span><span>{record.voucher_issuance_date || '—'}</span></div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Search Exp:</span><span>{record.search_expiration_date || '—'}</span>{daysRemaining !== null && <Badge variant={daysRemaining < 0 ? 'destructive' : daysRemaining < 14 ? 'secondary' : 'outline'}>{daysRemaining < 0 ? 'Expired' : `${daysRemaining}d left`}</Badge>}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Lease:</span><span>{record.lease_date || '—'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Name:</span><span>{record.contact_name || '—'}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{record.contact_email || '—'}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{record.contact_phone || '—'}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Financials */}
          {(record.hap_amount || record.contract_rent) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financials</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Bedrooms</p><p className="font-semibold">{record.bedroom_size || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">HAP</p><p className="font-semibold">${Number(record.hap_amount || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Contract Rent</p><p className="font-semibold">${Number(record.contract_rent || 0).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Admin Fee</p><p className="font-semibold">${Number(record.admin_fee || 0).toFixed(2)}</p></div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />HUD Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>HUD-52665 (Family Portability Information)</span>{record.hud52665_url ? <a href={record.hud52665_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a> : <span className="text-muted-foreground">Not uploaded</span>}</div>
              <div className="flex items-center justify-between"><span>HUD-52665-B (Billing Form)</span>{record.hud52665b_url ? <a href={record.hud52665b_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a> : <span className="text-muted-foreground">Not uploaded</span>}</div>
            </CardContent>
          </Card>

          {/* Billing table for billed port-ins */}
          {isPortIn && record.billing_arrangement === 'billed' && (
            <PortabilityBillingTable portabilityId={portabilityId} agencyId={record.agency_id} defaultHapAmount={record.hap_amount} defaultAdminFee={record.admin_fee} />
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>
              <div><Label>Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={3} /></div>
              <Button onClick={saveNotes} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save Notes</Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortabilityDetail;
