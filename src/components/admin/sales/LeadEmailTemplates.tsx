import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Loader2, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Lead {
  id: string;
  contact_name: string;
  contact_email: string;
  agency_name: string;
}

const TEMPLATES = {
  intro: {
    label: 'Intro / Discovery Call',
    subject: 'OpenKey — quick intro for {{agency_name}}',
    body: `Hi {{contact_name}},

Thanks for reaching out about {{agency_name}}. I'd love to learn more about your current workflows and show you how OpenKey is helping PHAs cut admin time and replace legacy software.

Would a 20-minute call this week work? Here are a few times that work on my end:
• [Day, time]
• [Day, time]
• [Day, time]

Happy to send a Calendly link if easier.

Best,
[Your name]
OpenKey`,
  },
  proposal: {
    label: 'Send Proposal',
    subject: 'Your OpenKey proposal — {{agency_name}}',
    body: `Hi {{contact_name}},

Following up on our conversation. Attached you'll find a tailored proposal for {{agency_name}}, including:
• Module scope and pricing
• Implementation timeline
• Migration plan from your current system

Let me know if you have any questions or want to schedule a follow-up to walk through it.

Best,
[Your name]
OpenKey`,
  },
  contract: {
    label: 'Send Contract',
    subject: 'Contract for {{agency_name}} — ready to sign',
    body: `Hi {{contact_name}},

Excited to move forward! Attached is the service agreement for {{agency_name}}.

Once signed, we'll kick off implementation immediately:
1. Schedule a data migration call
2. Send onboarding portal credentials
3. Train your team

Let me know if you need any changes to the contract.

Best,
[Your name]
OpenKey`,
  },
  onboarding: {
    label: 'Send Onboarding Link',
    subject: 'Welcome to OpenKey, {{agency_name}}!',
    body: `Hi {{contact_name}},

Welcome aboard! Your OpenKey workspace is ready.

→ Log in here: https://openkeyhousing.com/agency/login
→ Onboarding wizard: complete the 5-step setup to go live
→ Your dedicated implementation specialist will reach out within 24 hours

Looking forward to supporting your team!

Best,
[Your name]
OpenKey`,
  },
  followup: {
    label: 'Gentle Follow-up',
    subject: 'Following up — {{agency_name}}',
    body: `Hi {{contact_name}},

Just floating this back to the top of your inbox. Are you still evaluating options for {{agency_name}}? Happy to answer any questions or set up another walkthrough.

Best,
[Your name]
OpenKey`,
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

const fill = (text: string, lead: Lead) =>
  text
    .split('{{agency_name}}').join(lead.agency_name)
    .split('{{contact_name}}').join(lead.contact_name.split(' ')[0] || lead.contact_name);

export const LeadEmailTemplates: React.FC<{ lead: Lead }> = ({ lead }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tplKey, setTplKey] = useState<TemplateKey>('intro');
  const [subject, setSubject] = useState(() => fill(TEMPLATES.intro.subject, lead));
  const [body, setBody] = useState(() => fill(TEMPLATES.intro.body, lead));
  const [sending, setSending] = useState(false);
  const [attachRfp, setAttachRfp] = useState(false);

  const tpl = TEMPLATES[tplKey];

  const handleTemplateChange = (k: TemplateKey) => {
    setTplKey(k);
    setSubject(fill(TEMPLATES[k].subject, lead));
    setBody(fill(TEMPLATES[k].body, lead));
  };

  const send = async () => {
    setSending(true);
    try {
      let finalBody = body;
      let rfpPath: string | null = null;

      // Optionally generate an RFP packet PDF and append a download link.
      if (attachRfp) {
        const { data: rfp, error: rfpErr } = await supabase.functions.invoke('generate-rfp-packet', {
          body: {
            categories: ['security', 'hud_compliance', 'architecture', 'data_handling', 'support'],
            recipient_name: lead.contact_name,
            recipient_org: lead.agency_name,
          },
        });
        if (rfpErr || !rfp?.success) {
          throw new Error(rfp?.error || rfpErr?.message || 'Could not generate RFP packet');
        }
        rfpPath = rfp.pdf_path as string;
        const { data: signed } = await supabase.storage
          .from('agency-documents')
          .createSignedUrl(rfpPath, 60 * 60 * 24 * 7); // 7 days
        const url = signed?.signedUrl;
        if (url) {
          finalBody = `${body}\n\n---\nRFP / Security Packet (PDF, link valid 7 days):\n${url}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('send-lead-email', {
        body: {
          lead_id: lead.id,
          to: lead.contact_email,
          subject,
          body: finalBody,
          template_key: tplKey,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Send failed');
      }

      // Log the RFP packet send (best-effort, non-fatal).
      if (attachRfp && rfpPath) {
        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('rfp_packets_sent').insert({
          lead_id: lead.id,
          recipient_email: lead.contact_email,
          recipient_name: lead.contact_name,
          recipient_org: lead.agency_name,
          packet_type: 'full',
          included_categories: ['security', 'hud_compliance', 'architecture', 'data_handling', 'support'],
          pdf_path: rfpPath,
          sent_by: user?.id,
        });
      }

      toast({
        title: 'Email sent',
        description: attachRfp
          ? `To ${lead.contact_email} with RFP packet link`
          : `To ${lead.contact_email}`,
      });
      qc.invalidateQueries({ queryKey: ['agency_lead_activities', lead.id] });
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Mail className="h-4 w-4" /> Send Sales Email
      </div>
      <div>
        <Label className="text-xs">Template</Label>
        <Select value={tplKey} onValueChange={(v) => handleTemplateChange(v as TemplateKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TEMPLATES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Body</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer rounded-md border bg-card px-3 py-2">
        <Checkbox
          checked={attachRfp}
          onCheckedChange={(v) => setAttachRfp(v === true)}
        />
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          Attach RFP / Security packet
          <span className="text-muted-foreground"> — appends a download link to the email</span>
        </span>
      </label>
      <Button onClick={send} disabled={sending || !subject.trim() || !body.trim()} className="w-full">
        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send to {lead.contact_email}</>}
      </Button>
    </div>
  );
};
