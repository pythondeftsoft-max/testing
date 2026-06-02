import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { PipelineCard } from './usePipelineData';

type TemplateKey = 'intro' | 'follow_up_after_brief' | 'rfp_response';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: PipelineCard[];
}

interface SendResult {
  card: PipelineCard;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  message?: string;
}

export function BulkEmailDialog({ open, onOpenChange, recipients }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);

  const sendable = recipients.filter((r) => !!r.contact_email);
  const skipped = recipients.length - sendable.length;

  useEffect(() => {
    if (open) {
      setSubject('');
      setBody('');
      setTemplate('intro');
      setResults([]);
    }
  }, [open]);

  const sendAll = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and body are required.', variant: 'destructive' });
      return;
    }
    setSending(true);
    const initial: SendResult[] = recipients.map((r) => ({
      card: r,
      status: r.contact_email ? 'pending' : 'skipped',
      message: r.contact_email ? undefined : 'No email on file',
    }));
    setResults(initial);

    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < initial.length; i++) {
      const r = initial[i];
      if (r.status === 'skipped') continue;
      const card = r.card;
      const personalizedSubject = subject.replace(/\{agency\}/gi, card.agency_name);
      const personalizedBody = body
        .replace(/\{agency\}/gi, card.agency_name)
        .replace(/\{contact\}/gi, card.contact_name ?? card.ed_name ?? 'there');

      try {
        const fnName = card.source === 'lead' ? 'send-lead-email' : 'send-prospect-email';
        const payload = card.source === 'lead'
          ? { lead_id: card.id, to: card.contact_email!, subject: personalizedSubject, body: personalizedBody, template_key: template }
          : { housing_authority_id: card.housing_authority_id ?? '', to: card.contact_email!, subject: personalizedSubject, body: personalizedBody, template_key: template };

        const { data, error } = await supabase.functions.invoke(fnName, { body: payload });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error ?? 'Send failed');
        okCount++;
        setResults((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: 'success' } : p)));
      } catch (e: any) {
        failCount++;
        setResults((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: 'failed', message: e.message } : p)));
      }
    }

    setSending(false);
    toast({
      title: `Sent ${okCount} of ${sendable.length}`,
      description: failCount > 0 ? `${failCount} failed${skipped > 0 ? `, ${skipped} skipped (no email)` : ''}` : 'All emails sent successfully',
      variant: failCount > 0 ? 'destructive' : 'default',
    });
    qc.invalidateQueries({ queryKey: ['agency-sales'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk email</DialogTitle>
          <DialogDescription>
            Sending to <strong>{sendable.length}</strong> recipient{sendable.length === 1 ? '' : 's'}
            {skipped > 0 && <> · {skipped} skipped (no email on file)</>}.
            Use <code className="text-xs">{'{agency}'}</code> and <code className="text-xs">{'{contact}'}</code> for personalization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)} disabled={sending}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intro">Intro (cold first-touch)</SelectItem>
                <SelectItem value="follow_up_after_brief">Follow-up (after brief)</SelectItem>
                <SelectItem value="rfp_response">RFP response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick idea for {agency}"
              disabled={sending}
            />
          </div>

          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Hi {contact}, ..."
              disabled={sending}
            />
          </div>

          {results.length > 0 && (
            <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                  {r.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  {r.status === 'pending' && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                  {r.status === 'skipped' && <Badge variant="outline" className="text-[10px] h-4">skip</Badge>}
                  <span className="truncate flex-1">{r.card.agency_name}</span>
                  <span className="text-muted-foreground truncate">{r.message ?? r.card.contact_email}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground pt-1">
          Sending as <span className="font-mono">sales@openkeyhousing.com</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            {results.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={sendAll} disabled={sending || !subject || !body || sendable.length === 0}>
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            {sending ? 'Sending…' : `Send to ${sendable.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
