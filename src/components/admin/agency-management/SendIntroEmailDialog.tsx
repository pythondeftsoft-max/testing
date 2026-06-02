import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** For prospect mode: the housing_authority_id. For lead mode: the agency_leads.id */
  housingAuthorityId: string;
  authorityName: string;
  defaultRecipient?: string | null;
  prospectId?: string | null;
  /** 'prospect' (default) calls send-prospect-email; 'lead' calls send-lead-email */
  mode?: 'prospect' | 'lead';
}

type TemplateKey = 'intro' | 'follow_up_after_brief' | 'rfp_response';

export function SendIntroEmailDialog({
  open,
  onOpenChange,
  housingAuthorityId,
  authorityName,
  defaultRecipient,
  prospectId,
  mode = 'prospect',
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [to, setTo] = useState(defaultRecipient ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultRecipient ?? '');
      setSubject('');
      setBody('');
      setTemplate('intro');
    }
  }, [open, defaultRecipient]);

  const draft = async () => {
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('draft-prospect-outreach', {
        body: { housing_authority_id: housingAuthorityId, template },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Draft failed');
      setSubject(data.subject);
      setBody(data.body);
    } catch (e: any) {
      toast({ title: 'AI draft failed', description: e.message, variant: 'destructive' });
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast({ title: 'Missing fields', description: 'Recipient, subject, and body are required.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const fnName = mode === 'lead' ? 'send-lead-email' : 'send-prospect-email';
      const payload = mode === 'lead'
        ? { lead_id: housingAuthorityId, to: to.trim(), subject: subject.trim(), body: body.trim(), template_key: template }
        : { housing_authority_id: housingAuthorityId, to: to.trim(), subject: subject.trim(), body: body.trim(), template_key: template };
      const { data, error } = await supabase.functions.invoke(fnName, { body: payload });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Send failed');
      toast({ title: 'Email sent', description: `To ${to}` });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      qc.invalidateQueries({ queryKey: ['prospect-notes', prospectId] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send intro email</DialogTitle>
          <DialogDescription>
            To {authorityName}. Sending will mark this prospect as <strong>contacted</strong> and log the email in activity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Intro (cold first-touch)</SelectItem>
                  <SelectItem value="follow_up_after_brief">Follow-up (after brief)</SelectItem>
                  <SelectItem value="rfp_response">RFP response</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={draft} disabled={drafting} variant="outline" size="sm" className="w-full">
                {drafting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                {drafting ? 'Drafting…' : 'AI draft this email'}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.gov" />
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quick idea for…" />
          </div>

          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Click 'AI draft' or write your own…"
            />
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground pt-1">
          Sending as <span className="font-mono">sales@openkeyhousing.com</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || !to || !subject || !body}>
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            {sending ? 'Sending…' : 'Send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
