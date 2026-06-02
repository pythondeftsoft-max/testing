import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Building2, FileText, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeadDemoVideo } from './LeadDemoVideo';
import { LeadEmailTemplates } from './LeadEmailTemplates';
import { LeadProposalGenerator } from './LeadProposalGenerator';
import RFPPacketSender from '@/components/admin/RFPPacketSender';
import { Shield } from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'demo_scheduled' | 'proposal_sent' | 'won' | 'lost';

interface Props {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

export const LeadDetailDrawer: React.FC<Props> = ({ leadId, open, onClose, onStatusChange }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState('');
  const [converting, setConverting] = useState(false);
  const [rfpOpen, setRfpOpen] = useState(false);

  const { data: lead } = useQuery({
    queryKey: ['agency_lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('agency_leads')
        .select('*')
        .eq('id', leadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const { data: activities } = useQuery({
    queryKey: ['agency_lead_activities', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('agency_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      if (!leadId) throw new Error('No lead');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('agency_lead_activities').insert({
        lead_id: leadId,
        actor_id: user?.id,
        activity_type: 'note',
        description: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      qc.invalidateQueries({ queryKey: ['agency_lead_activities', leadId] });
      toast({ title: 'Note added' });
    },
  });

  const handleConvert = async () => {
    if (!lead) return;
    if (!confirm(`Create a new agency for "${lead.agency_name}"?\n\nThis will:\n• Create a housing_authorities row\n• Initialize onboarding\n• Mark this lead as Won`)) return;

    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-lead-to-agency', {
        body: {
          lead_id: lead.id,
          agency_name: lead.agency_name,
          agency_state: lead.agency_state,
          invite_admin_email: lead.contact_email,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Conversion failed');
      }
      toast({
        title: 'Agency created',
        description: `${lead.agency_name} is ready for onboarding.`,
      });
      qc.invalidateQueries({ queryKey: ['agency_leads'] });
      qc.invalidateQueries({ queryKey: ['agency_lead', lead.id] });
    } catch (e: any) {
      toast({ title: 'Conversion failed', description: e.message, variant: 'destructive' });
    } finally {
      setConverting(false);
    }
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {lead.agency_name}
          </SheetTitle>
          <SheetDescription>
            Submitted {new Date(lead.created_at).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select
              value={lead.status}
              onValueChange={(v) => onStatusChange(lead.id, v as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contact</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {lead.contact_name}{lead.contact_role && ` (${lead.contact_role})`}</div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.contact_email}`} className="text-primary hover:underline">{lead.contact_email}</a>
              </div>
              {lead.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.contact_phone}`} className="text-primary hover:underline">{lead.contact_phone}</a>
                </div>
              )}
            </div>
          </div>

          {/* Agency details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Agency</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">State:</span> {lead.agency_state || '—'}</div>
              <div><span className="text-muted-foreground">Vouchers:</span> {lead.voucher_count?.toLocaleString() || '—'}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Current SW:</span> {lead.current_software || '—'}</div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Their Message</h3>
              <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{lead.message}</div>
            </div>
          )}

          {/* Convert */}
          {!lead.converted_agency_id && (
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Ready to onboard?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Once contracts are signed, convert this lead into a real agency record. They'll get the onboarding wizard on first login.
              </p>
              <Button onClick={handleConvert} disabled={converting} className="w-full">
                {converting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</> : 'Convert to Agency'}
              </Button>
            </div>
          )}

          {lead.converted_agency_id && (
            <div className="border border-success/30 rounded-lg p-4 bg-success/5">
              <div className="flex items-center gap-2 text-success font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Converted to Agency
              </div>
              <p className="text-sm text-muted-foreground mt-1">Agency ID: {lead.converted_agency_id}</p>
            </div>
          )}

          <Separator />

          {/* Sales tools — Loom video, email templates, proposal generator */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Sales Tools</h3>
            <LeadDemoVideo leadId={lead.id} initialUrl={lead.demo_video_url} />
            <LeadEmailTemplates lead={lead as any} />
            <LeadProposalGenerator lead={lead as any} />
            <Button variant="outline" className="w-full" onClick={() => setRfpOpen(true)}>
              <Shield className="w-4 h-4 mr-2" />Send RFP / Procurement Packet
            </Button>
            <RFPPacketSender
              open={rfpOpen}
              onOpenChange={setRfpOpen}
              leadId={lead.id}
              defaultEmail={lead.contact_email}
              defaultName={lead.contact_name}
              defaultOrg={lead.agency_name}
            />
          </div>

          <Separator />

          {/* Activity / Notes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Activity</h3>
            <div className="flex gap-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note (call summary, next steps...)"
                rows={2}
                maxLength={1000}
              />
            </div>
            <Button
              size="sm"
              onClick={() => addNote.mutate(noteText)}
              disabled={!noteText.trim() || addNote.isPending}
            >
              Add Note
            </Button>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activities?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              )}
              {activities?.map((a: any) => (
                <div key={a.id} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{a.activity_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
