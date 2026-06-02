import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  Mail,
  Phone,
  Globe,
  CalendarIcon,
  Send,
  Sparkles,
  FileText,
  Trophy,
  XCircle,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PIPELINE_STAGES,
  stageToLeadStatus,
  stageToProspectStatus,
  type PipelineCard,
  type PipelineStage,
} from './usePipelineData';
import { SendIntroEmailDialog } from '@/components/admin/agency-management/SendIntroEmailDialog';
import { WalletQuoteCard } from '@/components/admin/agency-management/WalletQuoteCard';
import { TechStackChips } from '@/components/admin/agency-management/TechStackChips';
import { computePricing, formatCurrency, formatK, TIER_LABELS, TIER_BADGE_CLASS } from '@/lib/prospectPricing';
import { DealContactsPanel } from './DealContactsPanel';
import { DealStageHistoryTab } from './DealStageHistoryTab';
import { ProcurementPanel } from './ProcurementPanel';
import { SignedBillingPanel } from './SignedBillingPanel';

interface Props {
  card: PipelineCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert?: (card: PipelineCard) => void;
}

type NoteKind = 'research' | 'call' | 'meeting' | 'email' | 'quote' | 'objection' | 'system' | 'other';

const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  research: 'Research',
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  quote: 'Quote',
  objection: 'Objection',
  system: 'System',
  other: 'Other',
};

export function DealWorkspaceDrawer({ card, open, onOpenChange, onConvert }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<string>('overview');
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('research');
  const [emailOpen, setEmailOpen] = useState(false);
  const [proposalAmount, setProposalAmount] = useState<string>('');
  const [proposalUrl, setProposalUrl] = useState<string>('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setTab('overview');
  }, [open, card?.id]);

  // ---- Fetch backing record (lead row OR prospect row + housing authority + enrichment) ----
  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal-workspace', card?.source, card?.id],
    enabled: !!card && open,
    queryFn: async () => {
      if (!card) return null;
      if (card.source === 'lead') {
        const { data, error } = await supabase
          .from('agency_leads')
          .select('*')
          .eq('id', card.id)
          .maybeSingle();
        if (error) throw error;
        return { kind: 'lead' as const, lead: data, prospect: null, ha: null, enr: null };
      } else {
        const { data: prospect, error: pErr } = await supabase
          .from('pha_prospect_status')
          .select('*')
          .eq('id', card.id)
          .maybeSingle();
        if (pErr) throw pErr;
        const haId = prospect?.housing_authority_id ?? card.housing_authority_id;
        let ha: any = null;
        let enr: any = null;
        if (haId) {
          const { data: haRow } = await supabase
            .from('housing_authorities')
            .select('id, name, slug, city, state, country, website, address, zipcode, zip, pha_code, latitude, longitude, is_active, is_onboarded, tenant_count, metadata, registry_status, is_archived, created_at, updated_at')
            .eq('id', haId)
            .maybeSingle();
          const { data: contact } = await (supabase as any).rpc('admin_get_housing_authority_contacts', { _ids: [haId] });
          const c = Array.isArray(contact) ? contact[0] : null;
          ha = haRow ? { ...haRow, email: c?.email ?? null, phone: c?.phone ?? null } : null;
          // pha_enrichment is keyed by pha_code (NOT housing_authority_id)
          const phaCode = ha?.pha_code;
          if (phaCode) {
            const { data: enrRow } = await (supabase as any)
              .from('pha_enrichment')
              .select('*')
              .eq('pha_code', phaCode)
              .maybeSingle();
            enr = enrRow;
          }
        }
        return { kind: 'prospect' as const, lead: null, prospect, ha, enr };
      }
    },
  });

  // ---- Notes (prospect: pha_prospect_notes by prospect.id; lead: filter by metadata.lead_id) ----
  const prospectNotesId = deal?.kind === 'prospect' ? deal.prospect?.id : null;
  const leadId = deal?.kind === 'lead' ? deal.lead?.id : null;

  const { data: notes = [] } = useQuery({
    queryKey: ['deal-notes', card?.source, card?.id, prospectNotesId, leadId],
    enabled: !!card && open && !!deal,
    queryFn: async () => {
      if (deal?.kind === 'prospect' && prospectNotesId) {
        const { data, error } = await supabase
          .from('pha_prospect_notes')
          .select('*')
          .eq('prospect_id', prospectNotesId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        return data || [];
      }
      if (deal?.kind === 'lead' && leadId) {
        const { data, error } = await supabase
          .from('pha_prospect_notes')
          .select('*')
          .contains('metadata', { lead_id: leadId } as any)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        return data || [];
      }
      return [];
    },
  });

  // ---- Files in storage ----
  const filesPrefix = card ? `${card.source}/${card.id}` : '';
  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ['deal-files', filesPrefix],
    enabled: !!card && open,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('prospect-files')
        .list(filesPrefix, { sortBy: { column: 'created_at', order: 'desc' } });
      if (error) return [];
      return data || [];
    },
  });

  // ---- Sync local state when deal loads ----
  useEffect(() => {
    if (deal?.kind === 'lead' && deal.lead) {
      setProposalAmount(deal.lead.proposal_amount?.toString() ?? '');
      setProposalUrl(deal.lead.proposal_pdf_url ?? '');
    }
  }, [deal?.kind, (deal as any)?.lead?.id]);

  // ---- Mutations ----
  const moveStage = useMutation({
    mutationFn: async (to: PipelineStage) => {
      if (!card) return;
      if (card.source === 'lead') {
        const patch: any = { status: stageToLeadStatus(to) };
        if (to === 'proposal') patch.proposal_sent_at = new Date().toISOString();
        const { error } = await supabase.from('agency_leads').update(patch).eq('id', card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pha_prospect_status')
          .update({ status: stageToProspectStatus(to) as any })
          .eq('id', card.id);
        if (error) throw error;
      }
      // smart-default follow-ups
      const followUpDays = to === 'engaged' ? 3 : to === 'proposal' ? 5 : null;
      if (followUpDays != null) {
        const next = new Date();
        next.setDate(next.getDate() + followUpDays);
        if (card.source === 'lead') {
          await supabase
            .from('agency_leads')
            .update({ next_follow_up_at: next.toISOString() })
            .eq('id', card.id);
        } else {
          await supabase
            .from('pha_prospect_status')
            .update({ next_action_at: next.toISOString() })
            .eq('id', card.id);
        }
      }
    },
    onSuccess: (_d, to) => {
      const label = PIPELINE_STAGES.find((s) => s.id === to)?.label;
      toast({ title: 'Stage updated', description: `Moved to ${label}` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      qc.invalidateQueries({ queryKey: ['deal-workspace'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const setFollowUp = useMutation({
    mutationFn: async (date: Date | null) => {
      if (!card) return;
      const iso = date?.toISOString() ?? null;
      if (card.source === 'lead') {
        const { error } = await supabase
          .from('agency_leads')
          .update({ next_follow_up_at: iso })
          .eq('id', card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pha_prospect_status')
          .update({ next_action_at: iso })
          .eq('id', card.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      qc.invalidateQueries({ queryKey: ['deal-workspace'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!card || !noteText.trim()) return;
      const user = (await supabase.auth.getUser()).data.user;
      const meta: any = card.source === 'lead' ? { lead_id: card.id } : {};
      // For prospects we need a pha_prospect_status id; for leads we just store with prospect_id=null and a lead_id metadata flag.
      const insertRow: any = {
        prospect_id: card.source === 'prospect' ? card.id : null,
        author_user_id: user?.id ?? null,
        note: noteText.trim(),
        kind: noteKind,
        metadata: meta,
      };
      const { error } = await supabase.from('pha_prospect_notes').insert(insertRow);
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      qc.invalidateQueries({ queryKey: ['deal-notes'] });
      toast({ title: 'Note added' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const saveQuote = async () => {
    if (!card || card.source !== 'lead') return;
    setSavingQuote(true);
    try {
      const patch: any = {
        proposal_amount: proposalAmount ? Number(proposalAmount) : null,
        proposal_pdf_url: proposalUrl.trim() || null,
      };
      const { error } = await supabase.from('agency_leads').update(patch).eq('id', card.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      qc.invalidateQueries({ queryKey: ['deal-workspace'] });
      toast({ title: 'Quote saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingQuote(false);
    }
  };

  const generateBrief = async () => {
    if (!card || card.source !== 'prospect' || !card.housing_authority_id) return;
    setGeneratingBrief(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agency-brief', {
        body: { housing_authority_id: card.housing_authority_id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Brief failed');
      qc.invalidateQueries({ queryKey: ['deal-notes'] });
      toast({ title: 'Brief generated', description: 'See the Notes tab.' });
    } catch (e: any) {
      toast({ title: 'Brief failed', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingBrief(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!card || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const path = `${card.source}/${card.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('prospect-files').upload(path, file);
      if (error) throw error;
      toast({ title: 'Uploaded', description: file.name });
      refetchFiles();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = async (name: string) => {
    if (!card) return;
    const { error } = await supabase.storage
      .from('prospect-files')
      .remove([`${card.source}/${card.id}/${name}`]);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    refetchFiles();
  };

  const downloadFile = async (name: string) => {
    if (!card) return;
    const { data, error } = await supabase.storage
      .from('prospect-files')
      .createSignedUrl(`${card.source}/${card.id}/${name}`, 60);
    if (error || !data) {
      toast({ title: 'Download failed', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  // ---- Derived values ----
  const followUpDate = useMemo(() => {
    if (!deal) return null;
    const iso =
      deal.kind === 'lead' ? deal.lead?.next_follow_up_at : deal.prospect?.next_action_at;
    return iso ? new Date(iso) : null;
  }, [deal]);

  const lastStageChange = useMemo(() => {
    if (!deal) return null;
    const iso = (deal.kind === 'lead' ? deal.lead : deal.prospect)?.last_stage_change_at;
    return iso ? new Date(iso) : null;
  }, [deal]);

  const pricing = useMemo(() => {
    if (deal?.kind !== 'prospect') return null;
    const enr = deal.enr;
    const meta = deal.ha?.metadata ?? {};
    const leasedUnits =
      enr?.leased_units ?? meta.voucher_count ?? meta.section8_units ?? null;
    if (!leasedUnits && !enr) return null;
    return computePricing({
      adminFeeColA: enr?.admin_fee_col_a ?? null,
      adminFeeColB: enr?.admin_fee_col_b ?? null,
      leasedUnits,
      isMtw: enr?.is_mtw ?? false,
      fallbackAdminBudget:
        enr?.estimated_admin_budget_annual ??
        enr?.estimated_admin_budget_fallback ??
        null,
      override: (deal.prospect?.pricing_override as any) ?? null,
    });
  }, [deal]);

  if (!card) return null;

  const recipient =
    deal?.kind === 'lead'
      ? deal.lead?.contact_email
      : deal?.ha?.ed_email ?? deal?.ha?.email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl p-0">
        {/* Sticky header */}
        <div className="border-b bg-background px-6 py-4 sticky top-0 z-10">
          <SheetHeader className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {card.source === 'lead' ? 'Inbound lead' : 'Outbound prospect'}
              </Badge>
              {card.agency_state && <Badge variant="outline">{card.agency_state}</Badge>}
              {card.voucher_count != null && (
                <Badge variant="outline">{card.voucher_count.toLocaleString()} vch</Badge>
              )}
              {pricing?.hasData && (
                <Badge variant="outline" className={cn('text-[10px]', TIER_BADGE_CLASS[pricing.tier])}>
                  {TIER_LABELS[pricing.tier]}
                </Badge>
              )}
              {lastStageChange && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    Date.now() - lastStageChange.getTime() > 14 * 86400_000 &&
                      'border-destructive text-destructive',
                    Date.now() - lastStageChange.getTime() > 7 * 86400_000 &&
                      Date.now() - lastStageChange.getTime() <= 14 * 86400_000 &&
                      'border-yellow-500 text-yellow-700',
                  )}
                >
                  {formatDistanceToNow(lastStageChange)} in stage
                </Badge>
              )}
            </div>
            <SheetTitle className="text-left">{card.agency_name}</SheetTitle>
            <SheetDescription className="text-left text-xs">
              {card.contact_name && `${card.contact_name} · `}
              {recipient ?? 'No contact email on file'}
            </SheetDescription>
          </SheetHeader>

          {/* Stage + follow-up controls */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Stage</Label>
              <Select
                value={card.stage}
                onValueChange={(v) => moveStage.mutate(v as PipelineStage)}
                disabled={moveStage.isPending}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Follow-up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 w-full justify-start text-left font-normal',
                      !followUpDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {followUpDate ? format(followUpDate, 'MMM d') : 'None'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate ?? undefined}
                    onSelect={(d) => setFollowUp.mutate(d ?? null)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                  {followUpDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setFollowUp.mutate(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {(card.stage === 'agreement' || card.stage === 'onboarding') && onConvert && (card.conversion_step ?? 0) < 6 && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="font-medium text-emerald-700 dark:text-emerald-300">
                  Agreement signed — conversion in progress (step {card.conversion_step ?? 0}/6)
                </div>
                <div className="text-muted-foreground">Capture plan, modules, integrations, contacts, and provision the agency.</div>
              </div>
              <Button size="sm" onClick={() => onConvert(card)}>
                Continue conversion
              </Button>
            </div>
          )}
          {card.stage === 'live' && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Agency is live in production.
            </div>
          )}
        </div>

        {dealLoading || !deal ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading deal…
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="px-6 py-4">
            <TabsList className="w-full grid grid-cols-9">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="procurement">Procure</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="quote">Quote</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4">
              <DealContactsPanel card={card} />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <DealStageHistoryTab card={card} />
            </TabsContent>
            <TabsContent value="procurement" className="mt-4">
              <ProcurementPanel card={card} />
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
              <SignedBillingPanel card={card} />
            </TabsContent>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Contacts */}
              <section className="rounded-md border p-3 space-y-1.5 text-sm">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Contact
                </h3>
                {deal.kind === 'lead' ? (
                  <>
                    {deal.lead?.contact_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">{deal.lead.contact_name}</span>
                      </div>
                    )}
                    {deal.lead?.contact_role && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role</span>
                        <span>{deal.lead.contact_role}</span>
                      </div>
                    )}
                    {deal.lead?.contact_email && (
                      <a
                        href={`mailto:${deal.lead.contact_email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {deal.lead.contact_email}
                      </a>
                    )}
                    {deal.lead?.contact_phone && (
                      <a
                        href={`tel:${deal.lead.contact_phone}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {deal.lead.contact_phone}
                      </a>
                    )}
                    {deal.lead?.current_software && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current software</span>
                        <span>{deal.lead.current_software}</span>
                      </div>
                    )}
                    {deal.lead?.message && (
                      <div className="pt-2 mt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Their message</div>
                        <p className="text-xs whitespace-pre-wrap italic">{deal.lead.message}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {deal.ha?.ed_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Executive Director</span>
                        <span className="font-medium">{deal.ha.ed_name}</span>
                      </div>
                    )}
                    {deal.ha?.ed_email && (
                      <a
                        href={`mailto:${deal.ha.ed_email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {deal.ha.ed_email}
                      </a>
                    )}
                    {deal.ha?.ed_phone && (
                      <a
                        href={`tel:${deal.ha.ed_phone}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {deal.ha.ed_phone}
                      </a>
                    )}
                    {deal.ha?.metadata?.website && (
                      <a
                        href={deal.ha.metadata.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {deal.ha.metadata.website}
                      </a>
                    )}
                    {!deal.ha?.ed_email && !deal.ha?.ed_phone && (
                      <p className="text-xs italic text-muted-foreground">
                        No contact info on file.
                      </p>
                    )}
                  </>
                )}
              </section>

              {/* Outbound: pricing + tech stack */}
              {deal.kind === 'prospect' && pricing && (
                <>
                  {pricing.hasData && (
                    <section className="rounded-md border bg-muted/30 p-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Admin budget</div>
                        <div className="text-sm font-bold tabular-nums">{formatK(pricing.adminBudget)}</div>
                        <div className="text-[10px] text-muted-foreground">/ year</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Suggested ARR</div>
                        <div className="text-sm font-bold tabular-nums text-primary">{formatCurrency(pricing.finalAnnual)}</div>
                        <div className="text-[10px] text-muted-foreground">{pricing.hasOverride ? 'override' : 'midpoint'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">$/vch/mo</div>
                        <div className="text-sm font-bold tabular-nums">${pricing.finalPerVoucherMonthly.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">{pricing.benchmarkRange}</div>
                      </div>
                    </section>
                  )}
                  <WalletQuoteCard
                    pricing={pricing}
                    utilizationPct={deal.enr?.utilization_pct ?? null}
                    onSaveOverride={async () => {}}
                    onSyncHud={async () => {}}
                    hudSyncing={false}
                    saving={false}
                  />
                  <section className="rounded-md border p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Detected tech stack
                    </div>
                    <TechStackChips
                      software={deal.enr?.detected_software}
                      paymentMethod={deal.enr?.detected_payment_method}
                      hasOnlinePortal={deal.enr?.has_online_portal}
                      portalVendor={deal.enr?.portal_vendor}
                    />
                  </section>
                </>
              )}

              {/* Quick actions */}
              <Separator />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Quick actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setEmailOpen(true)}
                    disabled={!recipient}
                  >
                    <Send className="mr-1 h-3 w-3" /> Send email
                  </Button>
                  {deal.kind === 'prospect' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateBrief}
                      disabled={generatingBrief}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {generatingBrief ? 'Generating…' : 'AI brief'}
                    </Button>
                  )}
                  {deal.kind === 'prospect' && card.housing_authority_id && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`/admin?tab=agency-management&authority=${card.housing_authority_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" /> Open authority
                      </a>
                    </Button>
                  )}
                </div>
              </section>

              {/* Won / Lost */}
              <Separator />
              <section className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => moveStage.mutate('agreement')}
                  disabled={card.stage === 'agreement' || card.stage === 'onboarding' || card.stage === 'live'}
                >
                  <Trophy className="mr-1 h-3 w-3" /> Mark Agreement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => moveStage.mutate('lost')}
                  disabled={card.stage === 'lost'}
                >
                  <XCircle className="mr-1 h-3 w-3" /> Mark Lost
                </Button>
              </section>
            </TabsContent>

            {/* NOTES */}
            <TabsContent value="notes" className="space-y-3 mt-4">
              <div className="rounded-md border p-3 space-y-2">
                <Select value={noteKind} onValueChange={(v) => setNoteKind(v as NoteKind)}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NOTE_KIND_LABEL) as NoteKind[])
                      .filter((k) => k !== 'system')
                      .map((k) => (
                        <SelectItem key={k} value={k}>
                          {NOTE_KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="What happened? What's next?"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => addNote.mutate()}
                  disabled={!noteText.trim() || addNote.isPending}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add note
                </Button>
              </div>

              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground text-center py-6">
                    No activity yet. Log your first note above.
                  </p>
                ) : (
                  notes.map((n: any) => (
                    <div key={n.id} className="rounded-md border p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {NOTE_KIND_LABEL[n.kind as NoteKind] ?? n.kind}
                        </Badge>
                        <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* EMAIL */}
            <TabsContent value="email" className="space-y-3 mt-4">
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm">
                  Send a templated or AI-drafted email to <strong>{recipient ?? '—'}</strong>.
                  Sending automatically logs the touch and advances the deal to <em>Contacted</em>.
                </p>
                <Button onClick={() => setEmailOpen(true)} disabled={!recipient}>
                  <Send className="mr-2 h-4 w-4" />
                  Compose email
                </Button>
                {!recipient && (
                  <p className="text-xs text-destructive">
                    No email on file — add a contact or use the website link in Overview.
                  </p>
                )}
              </div>

              <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">
                Email history
              </h4>
              <div className="space-y-2">
                {notes.filter((n: any) => n.kind === 'email').length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No emails sent yet.</p>
                ) : (
                  notes
                    .filter((n: any) => n.kind === 'email')
                    .map((n: any) => (
                      <div key={n.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{n.metadata?.to ?? 'Sent'}</span>
                          <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                        </div>
                        {n.metadata?.subject && (
                          <div className="font-medium text-sm mb-1">{n.metadata.subject}</div>
                        )}
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground line-clamp-4">
                          {n.note}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </TabsContent>

            {/* QUOTE */}
            <TabsContent value="quote" className="space-y-4 mt-4">
              {deal.kind === 'prospect' && pricing && (
                <WalletQuoteCard
                  pricing={pricing}
                  utilizationPct={deal.enr?.utilization_pct ?? null}
                  onSaveOverride={async () => {}}
                  onSyncHud={async () => {}}
                  hudSyncing={false}
                  saving={false}
                />
              )}
              {deal.kind === 'lead' && (
                <div className="space-y-3 rounded-md border p-4">
                  <div>
                    <Label>Monthly proposal amount (USD)</Label>
                    <Input
                      type="number"
                      value={proposalAmount}
                      onChange={(e) => setProposalAmount(e.target.value)}
                      placeholder="2500"
                    />
                  </div>
                  <div>
                    <Label>Proposal PDF URL</Label>
                    <Input
                      type="url"
                      value={proposalUrl}
                      onChange={(e) => setProposalUrl(e.target.value)}
                      placeholder="https://… (or upload in Files tab)"
                    />
                  </div>
                  <Button onClick={saveQuote} disabled={savingQuote}>
                    {savingQuote ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="mr-1 h-3 w-3" />
                    )}
                    Save quote
                  </Button>
                  {deal.lead?.proposal_sent_at && (
                    <p className="text-xs text-muted-foreground">
                      Last sent {formatDistanceToNow(new Date(deal.lead.proposal_sent_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              )}

              <Separator />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  When ready, move the stage to <strong>Proposal</strong> — follow-up auto-sets +5 days.
                </p>
                <Button
                  size="sm"
                  onClick={() => moveStage.mutate('proposal')}
                  disabled={card.stage === 'proposal'}
                >
                  Mark stage: Proposal sent
                </Button>
              </div>
            </TabsContent>

            {/* FILES */}
            <TabsContent value="files" className="space-y-3 mt-4">
              <div className="rounded-md border-2 border-dashed p-6 text-center">
                <input
                  id="deal-file-upload"
                  type="file"
                  className="hidden"
                  onChange={onUpload}
                  disabled={uploading}
                />
                <Label
                  htmlFor="deal-file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading…' : 'Upload RFP, deck, signed contract…'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Files are private to admins.
                </p>
              </div>

              {deal.kind === 'prospect' && deal.enr?.latest_rfp_url && (
                <a
                  href={deal.enr.latest_rfp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border p-2 text-sm text-primary hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4" /> Latest RFP from website
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              )}

              {files.length === 0 ? (
                <p className="text-xs italic text-muted-foreground text-center py-4">
                  No files uploaded yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {files.map((f: any) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{f.name.replace(/^\d+-/, '')}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => downloadFile(f.name)}
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => removeFile(f.name)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <SendIntroEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          mode={card.source === 'lead' ? 'lead' : 'prospect'}
          housingAuthorityId={
            card.source === 'lead' ? card.id : card.housing_authority_id ?? ''
          }
          authorityName={card.agency_name}
          defaultRecipient={recipient ?? null}
          prospectId={card.source === 'prospect' ? card.id : null}
        />
      </SheetContent>
    </Sheet>
  );
}
