import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agencyId: string;
  tenantId: string;
  tenantName?: string;
  onCreated?: () => void;
}

const TYPES = [
  { v: 'special', l: 'Special / Complaint' },
  { v: 'reinspection', l: 'Reinspection' },
  { v: 'move_in', l: 'Move-in' },
  { v: 'move_out', l: 'Move-out' },
  { v: 'quality_control', l: 'Quality control' },
];

const URGENCIES = [
  { v: 'low', l: 'Low' },
  { v: 'medium', l: 'Medium' },
  { v: 'high', l: 'High / Emergency' },
];

const RequestInspectionDialog: React.FC<Props> = ({ open, onOpenChange, agencyId, tenantId, tenantName, onCreated }) => {
  const [type, setType] = useState('special');
  const [urgency, setUrgency] = useState('medium');
  const [reason, setReason] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [hapContractId, setHapContractId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    (async () => {
      const { data } = await supabase
        .from('agency_hap_contracts')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      setHapContractId(data?.id || null);
    })();
  }, [open, tenantId, agencyId]);

  const submit = async () => {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    setSubmitting(true);
    const { data: userResp } = await supabase.auth.getUser();
    const requesterId = userResp?.user?.id;

    const payload: any = {
      agency_id: agencyId,
      tenant_id: tenantId,
      hap_contract_id: hapContractId,
      inspection_type: type,
      status: 'requested',
      urgency,
      request_reason: reason.trim(),
      preferred_date_start: start || null,
      preferred_date_end: end || null,
      requested_by: requesterId,
      requested_at: new Date().toISOString(),
    };

    const { data: insp, error } = await supabase.from('inspections').insert(payload).select('id').single();

    if (error) { setSubmitting(false); toast.error('Request failed'); return; }

    // If agency has auto-assign on, fire engine (fire-and-forget)
    const { data: settings } = await supabase
      .from('agency_operational_settings')
      .select('inspection_auto_assign')
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (settings?.inspection_auto_assign && insp?.id) {
      supabase.functions.invoke('auto-assign-inspections', { body: { inspectionId: insp.id } });
    }

    setSubmitting(false);
    toast.success('Inspection requested. Sent to queue.');
    onCreated?.();
    onOpenChange(false);
    setReason(''); setStart(''); setEnd(''); setUrgency('medium'); setType('special');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Request Inspection {tenantName && `· ${tenantName}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{URGENCIES.map(u => <SelectItem key={u.v} value={u.v}>{u.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="What needs to be inspected and why" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preferred from</Label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Preferred to</Label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
          {!hapContractId && (
            <p className="text-xs text-muted-foreground">No active HAP contract found for this tenant — request will still be queued without one.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Submitting...</> : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestInspectionDialog;
