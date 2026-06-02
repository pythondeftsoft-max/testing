import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProspectNotes, type ProspectRow } from '@/hooks/useProspects';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TIER_BADGE_CLASS,
  DATA_QUALITY_LABEL,
  DATA_QUALITY_DOT_CLASS,
  type ProspectStatus,
} from '@/lib/prospectScoring';
import { Mail, Phone, Globe, FileText, ExternalLink, Sparkles, Loader2, RefreshCw, Plus, Send, CalendarIcon } from 'lucide-react';
// PricingChip moved into WalletQuoteCard
import { TechStackChips } from './TechStackChips';
import { computePricing } from '@/lib/prospectPricing';
import { WalletQuoteCard } from './WalletQuoteCard';
import { SendIntroEmailDialog } from './SendIntroEmailDialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  row: ProspectRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectDetailDrawer({ row, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<'call' | 'email' | 'meeting' | 'research' | 'other'>('research');
  const [generating, setGenerating] = useState(false);
  const [scrapingWeb, setScrapingWeb] = useState(false);
  const [hudSyncing, setHudSyncing] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const { data: notes = [] } = useProspectNotes(row?.prospect?.id);

  const jumpToDeal = (prospectId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'agency-sales');
    params.set('sub', 'pipeline');
    params.set('deal', `prospect:${prospectId}`);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    onOpenChange(false);
  };

  const pushToPipeline = useMutation({
    mutationFn: async () => {
      if (!row) return { existed: false as boolean, prospectId: null as string | null };
      // Pre-check: does a prospect row already exist for this PHA?
      const { data: existing } = await supabase
        .from('pha_prospect_status')
        .select('id')
        .eq('housing_authority_id', row.id)
        .maybeSingle();
      if (existing?.id) {
        return { existed: true, prospectId: existing.id };
      }
      const user = (await supabase.auth.getUser()).data.user;
      const newStatus =
        row.prospect?.status && row.prospect.status !== 'cold' ? row.prospect.status : 'researching';
      const { data: inserted, error } = await supabase
        .from('pha_prospect_status')
        .upsert(
          {
            housing_authority_id: row.id,
            status: newStatus,
            owner_user_id: row.prospect?.owner_user_id ?? user?.id ?? null,
          },
          { onConflict: 'housing_authority_id' },
        )
        .select('id')
        .single();
      if (error) throw error;
      return { existed: false, prospectId: inserted?.id ?? null };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      if (result.existed) {
        toast({
          title: 'Already in pipeline',
          description: 'Use "Open in pipeline" to view the deal.',
        });
      } else {
        toast({
          title: 'Added to pipeline',
          description: 'See the card in Sales → Pipeline.',
        });
      }
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const setFollowUp = useMutation({
    mutationFn: async (date: Date | null) => {
      if (!row) return;
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('pha_prospect_status').upsert(
        {
          housing_authority_id: row.id,
          status: row.prospect?.status ?? 'researching',
          owner_user_id: row.prospect?.owner_user_id ?? user?.id ?? null,
          next_action_at: date ? date.toISOString() : null,
        } as any,
        { onConflict: 'housing_authority_id' },
      );
      if (error) throw error;
    },
    onSuccess: (_d, date) => {
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: date ? 'Follow-up scheduled' : 'Follow-up cleared' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const upsertStatus = useMutation({
    mutationFn: async (status: ProspectStatus) => {
      if (!row) return;
      const payload = {
        housing_authority_id: row.id,
        status,
        last_contacted_at:
          status !== 'cold' && status !== 'researching' ? new Date().toISOString() : row.prospect?.last_contacted_at ?? null,
      };
      const { error } = await supabase
        .from('pha_prospect_status')
        .upsert(payload, { onConflict: 'housing_authority_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: any) => toast({ title: 'Failed to update', description: e.message, variant: 'destructive' }),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!row || !noteText.trim()) return;
      let prospectId = row.prospect?.id;
      if (!prospectId) {
        const { data, error } = await supabase
          .from('pha_prospect_status')
          .upsert(
            { housing_authority_id: row.id, status: 'researching' },
            { onConflict: 'housing_authority_id' }
          )
          .select('id')
          .single();
        if (error) throw error;
        prospectId = data.id;
      }
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('pha_prospect_notes').insert({
        prospect_id: prospectId,
        author_user_id: user?.id ?? null,
        note: noteText.trim(),
        kind: noteKind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText('');
      qc.invalidateQueries({ queryKey: ['prospect-notes', row?.prospect?.id] });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: 'Note added' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const generateBrief = async () => {
    if (!row) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agency-brief', {
        body: { housing_authority_id: row.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
      toast({ title: 'Brief generated' });
    } catch (e: any) {
      toast({ title: 'Brief generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const scrapeWebsite = async () => {
    if (!row) return;
    setScrapingWeb(true);
    const slowHint = setTimeout(() => {
      toast({
        title: 'Still scanning…',
        description: 'PHA sites can be slow. Hang tight — we\'ll keep whatever pages succeed.',
      });
    }, 15_000);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-pha-website', {
        body: { housing_authority_id: row.id },
      });
      // Treat invoke transport errors as soft failures, not app crashes.
      if (error && !data) {
        toast({
          title: 'Scan failed',
          description: 'The site took too long or blocked the scanner. Try again, or paste a specific page URL.',
          variant: 'destructive',
        });
        return;
      }
      if (!data?.success) {
        toast({
          title: 'Scan failed',
          description: data?.error ?? 'Unknown error during scan.',
          variant: 'destructive',
        });
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-single', row.pha_code, row.id] });
      const pages = data.pages_scanned_count ?? 1;
      const vendors = data.software?.length ?? 0;
      const failed = Array.isArray(data.pages_failed) ? data.pages_failed.length : 0;
      toast({
        title: data.scan_depth === 'deep' ? `Deep-scanned ${pages} page${pages === 1 ? '' : 's'}` : 'Scanned homepage',
        description: `Found ${vendors} vendor${vendors === 1 ? '' : 's'} · portal: ${data.hasOnlinePortal ? 'yes' : 'no'}${data.portalVendor === 'none-detected' ? ' (likely homegrown)' : ''}${failed ? ` · ${failed} page${failed === 1 ? '' : 's'} skipped` : ''}`,
      });
    } catch (e: any) {
      toast({
        title: 'Scan failed',
        description: e?.message ?? 'Unexpected error.',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(slowHint);
      setScrapingWeb(false);
    }
  };

  const syncHud = async () => {
    if (!row?.pha_code) {
      toast({
        title: 'No PHA code on file',
        description: 'Cannot look up HUD admin-fee rate without a PHA code.',
        variant: 'destructive',
      });
      return;
    }
    setHudSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hud-admin-fees', {
        body: { mode: 'single', pha_code: row.pha_code },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Lookup failed');
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-single', row.pha_code, row.id] });
      if (data.matched) {
        toast({
          title: 'Official HUD rate applied',
          description: data.message,
        });
      } else {
        toast({
          title: 'Not in HUD schedule',
          description: data.message,
        });
      }
    } catch (e: any) {
      toast({ title: 'HUD lookup failed', description: e.message, variant: 'destructive' });
    } finally {
      setHudSyncing(false);
    }
  };

  const saveOverride = async (override: any) => {
    if (!row) return;
    setSavingOverride(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = override
        ? { ...override, set_by: user?.id ?? null, set_at: new Date().toISOString() }
        : null;
      const { error } = await supabase
        .from('pha_prospect_status')
        .upsert(
          {
            housing_authority_id: row.id,
            status: row.prospect?.status ?? 'researching',
            pricing_override: payload,
          } as any,
          { onConflict: 'housing_authority_id' }
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: payload ? 'Quote saved' : 'Reverted to suggested' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingOverride(false);
    }
  };

  // Re-fetch this PHA's enrichment so the wallet card reflects fresh HUD rates
  // immediately after "Check HUD rate" upserts a row in pha_enrichment.
  const { data: liveEnr } = useQuery({
    queryKey: ['pha-enrichment-single', row?.pha_code, row?.id],
    enabled: !!row && open,
    queryFn: async () => {
      if (!row) return null;
      const query = (supabase as any).from('pha_enrichment').select('*');
      const { data } = row.pha_code
        ? await query.eq('pha_code', row.pha_code).maybeSingle()
        : await query.eq('housing_authority_id', row.id).maybeSingle();
      return data ?? null;
    },
    staleTime: 0,
  });

  if (!row) return null;
  const status = row.prospect?.status ?? 'cold';
  const enr = liveEnr ?? row.enrichment;
  const pricing = computePricing({
    adminFeeColA: enr?.admin_fee_col_a,
    adminFeeColB: enr?.admin_fee_col_b,
    leasedUnits: enr?.leased_units ?? row.voucher_count,
    isMtw: row.mtw,
    fallbackAdminBudget: (enr as any)?.estimated_admin_budget_fallback ?? null,
    override: row.prospect?.pricing_override ?? null,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={TIER_BADGE_CLASS[row.scoring.tier]}>
              {row.scoring.tierLabel} · {row.scoring.score}
            </Badge>
            {row.mtw && <Badge variant="outline">MTW</Badge>}
            {row.is_onboarded && <Badge>Customer</Badge>}
          </div>
          <SheetTitle className="text-left">{row.name}</SheetTitle>
          <SheetDescription className="text-left">
            {row.city ? `${row.city}, ${row.state}` : row.state}{row.zip ? ` ${row.zip}` : ''} · PHA {row.pha_code}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Primary actions */}
          <section className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-3">
            {/* Add to pipeline ALWAYS only adds and stays on Prospecting. */}
            <Button
              size="sm"
              onClick={() => pushToPipeline.mutate()}
              disabled={pushToPipeline.isPending || (!!row.prospect?.id && status !== 'cold' && status !== 'researching')}
              variant="default"
              title={
                row.prospect?.id && status !== 'cold' && status !== 'researching'
                  ? 'Already in pipeline'
                  : undefined
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              {row.prospect?.id && status !== 'cold' && status !== 'researching'
                ? 'In pipeline'
                : 'Add to pipeline'}
            </Button>
            {row.prospect?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => jumpToDeal(row.prospect!.id)}
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Open in pipeline
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEmailOpen(true)}
              disabled={!row.ed_email && !row.email}
              title={!row.ed_email && !row.email ? 'No email on file' : undefined}
            >
              <Send className="mr-1 h-3 w-3" /> Send intro email
            </Button>
            <Button size="sm" variant="outline" onClick={generateBrief} disabled={generating}>
              <Sparkles className="mr-1 h-3 w-3" /> {generating ? 'Generating…' : 'Generate brief'}
            </Button>
          </section>

          {/* Why this score */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Why this score</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${DATA_QUALITY_DOT_CLASS[row.scoring.dataQuality]}`} />
                {DATA_QUALITY_LABEL[row.scoring.dataQuality]}
              </div>
            </div>
            <ul className="space-y-1.5 rounded-md border p-3 text-sm">
              {row.scoring.breakdown.map((b, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{b.label}</div>
                    <div className="text-xs text-muted-foreground">{b.detail}</div>
                  </div>
                  <span className={`font-mono text-sm ${b.points < 0 ? 'text-destructive' : ''}`}>
                    {b.points >= 0 ? '+' : ''}{b.points}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono">
                  {row.scoring.score}/100
                  {row.scoring.rawScore !== row.scoring.score && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (raw {row.scoring.rawScore}, capped)
                    </span>
                  )}
                </span>
              </li>
            </ul>
            {row.population != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                City population: {row.population.toLocaleString()}
                {row.metadata?.enriched_at && ` · enriched ${formatDistanceToNow(new Date(row.metadata.enriched_at), { addSuffix: true })}`}
              </p>
            )}
          </section>

          <Separator />

          {/* Intelligence — pricing + tech stack */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Intelligence</h3>
              <Button size="sm" variant="outline" onClick={scrapeWebsite} disabled={scrapingWeb}>
                {scrapingWeb ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                Scan website
              </Button>
            </div>

            <WalletQuoteCard
              pricing={pricing}
              utilizationPct={enr?.utilization_pct ?? null}
              onSaveOverride={saveOverride}
              onSyncHud={syncHud}
              hudSyncing={hudSyncing}
              saving={savingOverride}
            />

            <div className="rounded-md border p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Detected tech stack</div>
              <TechStackChips
                software={enr?.detected_software}
                paymentMethod={enr?.detected_payment_method}
                hasOnlinePortal={enr?.has_online_portal}
                portalVendor={enr?.portal_vendor}
              />
              {enr?.latest_rfp_url && (
                <a
                  href={enr.latest_rfp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" /> Latest RFP / procurement page
                </a>
              )}
              {enr?.website_enriched_at && (
                <div className="space-y-1 border-t pt-2 mt-2">
                  <p className="text-[10px] text-muted-foreground">
                    Last scanned: {formatDistanceToNow(new Date((enr as any).last_scanned_at ?? enr.website_enriched_at), { addSuffix: true })}
                    {' · '}
                    {(enr as any).pages_scanned_count ?? 1} page{((enr as any).pages_scanned_count ?? 1) === 1 ? '' : 's'}
                    {' · '}
                    {(enr as any).scan_depth ?? 'homepage'}
                  </p>
                  {Array.isArray((enr as any).pages_scanned) && (enr as any).pages_scanned.length > 0 && (
                    <details className="text-[10px] text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">View scanned URLs</summary>
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {((enr as any).pages_scanned as string[]).map((u) => (
                          <li key={u} className="truncate">
                            <a href={u} target="_blank" rel="noreferrer" className="hover:underline">
                              {u}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </section>

          <Separator />
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Contacts</h3>
            <div className="space-y-1 text-sm">
              {row.ed_name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Executive Director</span>
                  <span className="font-medium">{row.ed_name}</span>
                </div>
              )}
              {row.ed_email && (
                <a href={`mailto:${row.ed_email}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail className="h-3 w-3" /> {row.ed_email}
                </a>
              )}
              {row.ed_phone && (
                <a href={`tel:${row.ed_phone}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {row.ed_phone}
                </a>
              )}
              {row.email && !row.ed_email && (
                <a href={`mailto:${row.email}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail className="h-3 w-3" /> {row.email}
                </a>
              )}
              {row.phone && !row.ed_phone && (
                <a href={`tel:${row.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {row.phone}
                </a>
              )}
              {row.metadata?.website && (
                <a
                  href={row.metadata.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-3 w-3" /> {row.metadata.website}
                </a>
              )}
              {!row.ed_email && !row.email && !row.ed_phone && !row.phone && (
                <p className="text-xs italic text-muted-foreground">
                  No contact info on file. Import HUD ED data or research manually.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* Status + Follow-up */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Pipeline status</Label>
                <Select value={status} onValueChange={(v) => upsertStatus.mutate(v as ProspectStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Follow-up date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !row.prospect?.next_action_at && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {row.prospect?.next_action_at
                        ? format(new Date(row.prospect.next_action_at), 'PPP')
                        : 'No follow-up set'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={row.prospect?.next_action_at ? new Date(row.prospect.next_action_at) : undefined}
                      onSelect={(d) => setFollowUp.mutate(d ?? null)}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                    {row.prospect?.next_action_at && (
                      <div className="border-t p-2">
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setFollowUp.mutate(null)}>
                          Clear follow-up
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          {/* Secondary actions */}
          <section className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/admin?tab=agency-management&authority=${row.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Open in Authorities
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/admin?tab=agency-sales&sub=pipeline`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Open Sales pipeline
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(row.name + ' executive director')}`}
                target="_blank"
                rel="noreferrer"
              >
                <FileText className="mr-1 h-3 w-3" /> Research
              </a>
            </Button>
          </section>

          <Separator />

          {/* Notes */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Notes & activity</h3>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Select value={noteKind} onValueChange={(v) => setNoteKind(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                Add note
              </Button>
            </div>

            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="rounded-md border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{n.kind}</Badge>
                      <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </SheetContent>
      <SendIntroEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        housingAuthorityId={row.id}
        authorityName={row.name}
        defaultRecipient={row.ed_email ?? row.email}
        prospectId={row.prospect?.id}
      />
    </Sheet>
  );
}
