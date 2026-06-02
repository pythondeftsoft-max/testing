import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  defaultEmail?: string;
  defaultName?: string;
  defaultOrg?: string;
}

const allCategories = [
  { id: 'security', label: 'Security' },
  { id: 'hud_compliance', label: 'HUD Compliance' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'data_handling', label: 'Data Handling' },
  { id: 'support', label: 'Support & SLAs' },
];

const RFPPacketSender: React.FC<Props> = ({ open, onOpenChange, leadId, defaultEmail = '', defaultName = '', defaultOrg = '' }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [org, setOrg] = useState(defaultOrg);
  const [selected, setSelected] = useState<string[]>(allCategories.map(c => c.id));
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail); setName(defaultName); setOrg(defaultOrg);
      setSelected(allCategories.map(c => c.id));
      setPdfPath(null);
    }
  }, [open, defaultEmail, defaultName, defaultOrg]);

  const toggle = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const generate = async () => {
    if (selected.length === 0) { toast.error('Pick at least one category'); return; }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('generate-rfp-packet', {
      body: {
        categories: selected,
        recipient_name: name,
        recipient_org: org,
      },
    });
    setGenerating(false);
    if (error || !data?.success) { toast.error(data?.error || 'Generation failed'); return; }
    setPdfPath(data.pdf_path);
    toast.success('PDF generated');
  };

  const download = async () => {
    if (!pdfPath) return;
    const { data } = await supabase.storage.from('agency-documents').createSignedUrl(pdfPath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const sendAndLog = async () => {
    if (!email || !pdfPath) { toast.error('Generate the PDF and add an email first'); return; }
    setSending(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from('rfp_packets_sent').insert({
      lead_id: leadId,
      recipient_email: email,
      recipient_name: name || null,
      recipient_org: org || null,
      packet_type: selected.length === allCategories.length ? 'full' : 'custom',
      included_categories: selected,
      pdf_path: pdfPath,
      sent_by: user?.id,
    });
    setSending(false);
    if (error) { toast.error('Logging send failed'); return; }
    toast.success('Send recorded. Email packet manually or via your CRM.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send RFP Packet</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Recipient Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Organization</Label>
              <Input value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Include categories</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {allCategories.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          {pdfPath && (
            <Button variant="outline" onClick={download}>
              <Download className="w-4 h-4 mr-2" />Download
            </Button>
          )}
          <Button variant="outline" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {pdfPath ? 'Regenerate' : 'Generate PDF'}
          </Button>
          <Button onClick={sendAndLog} disabled={sending || !pdfPath || !email}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Record Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RFPPacketSender;
