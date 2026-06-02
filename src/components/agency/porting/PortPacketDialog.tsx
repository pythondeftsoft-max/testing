import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileText, Download, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portingRequestId: string;
  agencyId: string;
  packetType: 'outgoing' | 'incoming';
  onSaved?: () => void;
}

const PortPacketDialog: React.FC<Props> = ({ open, onOpenChange, portingRequestId, agencyId, packetType, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [existingPacketId, setExistingPacketId] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSend, setLastSend] = useState<{ email: string; status: string; at: string } | null>(null);
  const [form, setForm] = useState({
    current_hap_amount: '',
    current_tenant_rent: '',
    current_utility_allowance: '',
    bedroom_size: '',
    voucher_issued_date: '',
    voucher_expiration_date: '',
    receiving_pha_name: '',
    receiving_pha_code: '',
    receiving_pha_contact_email: '',
    receiving_pha_contact_phone: '',
    decision_notes: '',
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('agency_port_packets')
        .select('*')
        .eq('porting_request_id', portingRequestId)
        .maybeSingle();
      if (data) {
        setExistingPacketId(data.id);
        setPdfPath(data.packet_pdf_path);
        // Fetch latest send log
        const { data: sends } = await supabase
          .from('agency_port_packet_sends')
          .select('sent_to_email, status, created_at')
          .eq('packet_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (sends && sends.length > 0) {
          setLastSend({
            email: sends[0].sent_to_email,
            status: sends[0].status,
            at: sends[0].created_at,
          });
        } else {
          setLastSend(null);
        }
        setForm({
          current_hap_amount: data.current_hap_amount?.toString() || '',
          current_tenant_rent: data.current_tenant_rent?.toString() || '',
          current_utility_allowance: data.current_utility_allowance?.toString() || '',
          bedroom_size: data.bedroom_size?.toString() || '',
          voucher_issued_date: data.voucher_issued_date || '',
          voucher_expiration_date: data.voucher_expiration_date || '',
          receiving_pha_name: data.receiving_pha_name || '',
          receiving_pha_code: data.receiving_pha_code || '',
          receiving_pha_contact_email: data.receiving_pha_contact_email || '',
          receiving_pha_contact_phone: data.receiving_pha_contact_phone || '',
          decision_notes: data.decision_notes || '',
        });
      } else {
        setExistingPacketId(null);
        setPdfPath(null);
        setLastSend(null);
      }
    })();
  }, [open, portingRequestId]);

  const save = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload: any = {
      porting_request_id: portingRequestId,
      agency_id: agencyId,
      packet_type: packetType,
      current_hap_amount: form.current_hap_amount ? Number(form.current_hap_amount) : null,
      current_tenant_rent: form.current_tenant_rent ? Number(form.current_tenant_rent) : null,
      current_utility_allowance: form.current_utility_allowance ? Number(form.current_utility_allowance) : null,
      bedroom_size: form.bedroom_size ? Number(form.bedroom_size) : null,
      voucher_issued_date: form.voucher_issued_date || null,
      voucher_expiration_date: form.voucher_expiration_date || null,
      receiving_pha_name: form.receiving_pha_name || null,
      receiving_pha_code: form.receiving_pha_code || null,
      receiving_pha_contact_email: form.receiving_pha_contact_email || null,
      receiving_pha_contact_phone: form.receiving_pha_contact_phone || null,
      decision_notes: form.decision_notes || null,
      created_by: user?.id,
    };
    if (packetType === 'incoming' && !existingPacketId) {
      // 30-day SLA from today
      const sla = new Date();
      sla.setDate(sla.getDate() + 30);
      payload.sla_deadline = sla.toISOString();
      payload.decision = 'pending';
    }
    const { error } = existingPacketId
      ? await supabase.from('agency_port_packets').update(payload).eq('id', existingPacketId)
      : await supabase.from('agency_port_packets').insert(payload);
    setLoading(false);
    if (error) { toast.error('Failed to save packet'); return; }
    toast.success('Port packet saved');
    onSaved?.();
    onOpenChange(false);
  };

  const generatePdf = async () => {
    if (!existingPacketId) { toast.error('Save packet first'); return; }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('generate-port-packet', {
      body: { packet_id: existingPacketId },
    });
    setGenerating(false);
    if (error || !data?.success) { toast.error(data?.error || 'PDF generation failed'); return; }
    setPdfPath(data.pdf_path);
    toast.success('PDF generated');
    onSaved?.();
  };

  const downloadPdf = async () => {
    if (!pdfPath) return;
    const { data } = await supabase.storage.from('agency-documents').createSignedUrl(pdfPath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const sendToPha = async () => {
    if (!existingPacketId) { toast.error('Save the packet first'); return; }
    if (!pdfPath) { toast.error('Generate the PDF first'); return; }
    if (!form.receiving_pha_contact_email) {
      toast.error('Add a receiving PHA contact email');
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-port-packet', {
      body: {
        packet_id: existingPacketId,
        to_email: form.receiving_pha_contact_email,
        to_name: form.receiving_pha_name,
      },
    });
    setSending(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Send failed');
      return;
    }
    toast.success(`Packet emailed to ${form.receiving_pha_contact_email}`);
    setLastSend({
      email: form.receiving_pha_contact_email,
      status: 'sent',
      at: new Date().toISOString(),
    });
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{packetType === 'outgoing' ? 'Outgoing' : 'Incoming'} Port Packet (HUD-52665)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current HAP ($)</Label>
              <Input type="number" step="0.01" value={form.current_hap_amount}
                onChange={(e) => setForm({ ...form, current_hap_amount: e.target.value })} />
            </div>
            <div>
              <Label>Tenant Rent ($)</Label>
              <Input type="number" step="0.01" value={form.current_tenant_rent}
                onChange={(e) => setForm({ ...form, current_tenant_rent: e.target.value })} />
            </div>
            <div>
              <Label>Utility Allowance ($)</Label>
              <Input type="number" step="0.01" value={form.current_utility_allowance}
                onChange={(e) => setForm({ ...form, current_utility_allowance: e.target.value })} />
            </div>
            <div>
              <Label>Bedroom Size</Label>
              <Input type="number" value={form.bedroom_size}
                onChange={(e) => setForm({ ...form, bedroom_size: e.target.value })} />
            </div>
            <div>
              <Label>Voucher Issued</Label>
              <Input type="date" value={form.voucher_issued_date}
                onChange={(e) => setForm({ ...form, voucher_issued_date: e.target.value })} />
            </div>
            <div>
              <Label>Voucher Expires</Label>
              <Input type="date" value={form.voucher_expiration_date}
                onChange={(e) => setForm({ ...form, voucher_expiration_date: e.target.value })} />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm">{packetType === 'outgoing' ? 'Receiving' : 'Issuing'} PHA</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PHA Name</Label>
                <Input value={form.receiving_pha_name}
                  onChange={(e) => setForm({ ...form, receiving_pha_name: e.target.value })} />
              </div>
              <div>
                <Label>HUD PHA Code</Label>
                <Input value={form.receiving_pha_code}
                  onChange={(e) => setForm({ ...form, receiving_pha_code: e.target.value })} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.receiving_pha_contact_email}
                  onChange={(e) => setForm({ ...form, receiving_pha_contact_email: e.target.value })} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.receiving_pha_contact_phone}
                  onChange={(e) => setForm({ ...form, receiving_pha_contact_phone: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.decision_notes}
              onChange={(e) => setForm({ ...form, decision_notes: e.target.value })} />
          </div>

          {lastSend && (
            <div className="flex items-center gap-2 text-xs rounded-md border bg-muted/40 px-3 py-2">
              {lastSend.status === 'sent' ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <span>
                Last send to <span className="font-medium">{lastSend.email}</span> — {lastSend.status} on{' '}
                {new Date(lastSend.at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {pdfPath && (
            <Button variant="outline" onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
          )}
          {existingPacketId && (
            <Button variant="outline" onClick={generatePdf} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              {pdfPath ? 'Regenerate PDF' : 'Generate Packet PDF'}
            </Button>
          )}
          {pdfPath && packetType === 'outgoing' && (
            <Button
              variant="default"
              onClick={sendToPha}
              disabled={sending || !form.receiving_pha_contact_email}
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send to Receiving PHA
            </Button>
          )}
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Packet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PortPacketDialog;
