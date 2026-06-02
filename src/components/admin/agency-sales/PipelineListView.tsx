import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Phone, MoreHorizontal, ArrowUpDown, Search, MapPin, SkipForward, StickyNote } from 'lucide-react';
import { StageNotePopover } from './StageNotePopover';
import { SkipStageDialog } from './SkipStageDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SendIntroEmailDialog } from '@/components/admin/agency-management/SendIntroEmailDialog';
import { DealWorkspaceDrawer } from './DealWorkspaceDrawer';
import { PipelineBulkActionsBar } from './PipelineBulkActionsBar';
import { PipelineFunnelStrip } from './PipelineFunnelStrip';
import { ConvertToCustomerWizard } from './ConvertToCustomerWizard';
import { AdvanceStageDialog } from './AdvanceStageDialog';
import {
  usePipelineCards,
  PIPELINE_STAGES,
  STAGE_NEXT_ACTION,
  stageToLeadStatus,
  stageToProspectStatus,
  isStuck,
  isForwardMove,
  queueBucket,
  type PipelineCard,
  type PipelineStage,
} from './usePipelineData';
import { TodaysQueueCard, type QueueFilter } from './TodaysQueueCard';
import { computePricing, TIER_LABELS, TIER_BADGE_CLASS, type PricingResult } from '@/lib/prospectPricing';

type SortKey = 'agency' | 'vouchers' | 'days_in_stage' | 'next_action' | 'quote';
type SortDir = 'asc' | 'desc';

export default function PipelineListView() {
  const { data: cards = [], isLoading } = usePipelineCards();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'lead' | 'prospect'>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(null);
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('days_in_stage');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [emailCard, setEmailCard] = useState<PipelineCard | null>(null);
  const [openCard, setOpenCard] = useState<PipelineCard | null>(null);
  const [convertCard, setConvertCard] = useState<PipelineCard | null>(null);

  const [skipCard, setSkipCard] = useState<PipelineCard | null>(null);
  const [advanceCard, setAdvanceCard] = useState<{ card: PipelineCard; toStage: PipelineStage } | null>(null);

  const cardKey = (c: PipelineCard) => `${c.source}:${c.id}`;

  // Auto-open a deal from ?deal=source:id (e.g. set by ProspectTable / drawer)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const dealParam = searchParams.get('deal');
    if (!dealParam || cards.length === 0) return;
    const [src, id] = dealParam.split(':');
    const match = cards.find((c) => c.source === src && c.id === id);
    if (match) {
      setOpenCard(match);
      const params = new URLSearchParams(searchParams);
      params.delete('deal');
      setSearchParams(params, { replace: true });
    }
  }, [cards, searchParams, setSearchParams]);

  const handleStageMove = (card: PipelineCard, to: PipelineStage) => {
    // Side-rail (lost/dormant) and forward moves now require the capture form.
    if (to === 'lost' || to === 'dormant' || isForwardMove(card.stage, to)) {
      setAdvanceCard({ card, toStage: to });
      return;
    }
    // Backward / sideways: silent move (legacy behavior).
    moveCard.mutate({ card, to });
  };

  const moveCard = useMutation({
    mutationFn: async ({ card, to }: { card: PipelineCard; to: PipelineStage }) => {
      if (card.source === 'lead') {
        const { error } = await supabase.from('agency_leads').update({ status: stageToLeadStatus(to) as any }).eq('id', card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pha_prospect_status').update({ status: stageToProspectStatus(to) as any }).eq('id', card.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Moved', description: `${vars.card.agency_name} → ${PIPELINE_STAGES.find((s) => s.id === vars.to)?.label}` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter((c) => (sourceFilter === 'all' ? true : c.source === sourceFilter))
      .filter((c) => (stageFilter === 'all' ? true : c.stage === stageFilter))
      .filter((c) => (hasEmailOnly ? !!c.contact_email : true))
      .filter((c) => {
        if (!queueFilter) return true;
        if (queueFilter === 'stuck') return isStuck(c);
        return queueBucket(c.next_action_at) === queueFilter;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.agency_name.toLowerCase().includes(q) ||
          (c.contact_name ?? '').toLowerCase().includes(q) ||
          (c.contact_email ?? '').toLowerCase().includes(q) ||
          (c.agency_state ?? '').toLowerCase().includes(q)
        );
      });
  }, [cards, search, stageFilter, sourceFilter, queueFilter, hasEmailOnly]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const get = (c: PipelineCard): number | string => {
        switch (sortKey) {
          case 'agency': return c.agency_name.toLowerCase();
          case 'vouchers': return c.voucher_count ?? -1;
          case 'days_in_stage': return c.days_in_stage ?? -1;
          case 'next_action': return c.next_action_at ? new Date(c.next_action_at).getTime() : Number.MAX_SAFE_INTEGER;
          case 'quote': return c.proposal_amount ?? -1;
        }
      };
      const av = get(a);
      const bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const pricingByKey = useMemo(() => {
    const m = new Map<string, PricingResult>();
    sorted.forEach((c) => {
      if (c.source !== 'prospect') return;
      const enr = c.enrichment;
      const leasedUnits = enr?.leased_units ?? c.voucher_count ?? null;
      if (!leasedUnits && !enr) return;
      m.set(`${c.source}:${c.id}`, computePricing({
        adminFeeColA: enr?.admin_fee_col_a ?? null,
        adminFeeColB: enr?.admin_fee_col_b ?? null,
        leasedUnits,
        isMtw: enr?.is_mtw ?? false,
        fallbackAdminBudget: enr?.estimated_admin_budget_annual ?? enr?.estimated_admin_budget_fallback ?? null,
        override: c.pricing_override ?? null,
      }));
    });
    return m;
  }, [sorted]);

  const selectedCards = useMemo(
    () => sorted.filter((c) => selectedKeys.has(cardKey(c))),
    [sorted, selectedKeys]
  );

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  const allOnPageSelected = sorted.length > 0 && sorted.every((c) => selectedKeys.has(cardKey(c)));
  const someSelected = sorted.some((c) => selectedKeys.has(cardKey(c)));

  const toggleAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) sorted.forEach((c) => next.delete(cardKey(c)));
      else sorted.forEach((c) => next.add(cardKey(c)));
      return next;
    });
  };

  const toggleOne = (c: PipelineCard) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const k = cardKey(c);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Loading pipeline…
      </div>
    );
  }

  const stageLabel = (s: PipelineStage) => PIPELINE_STAGES.find((x) => x.id === s)?.label ?? s;
  const stageColor = (s: PipelineStage): string => {
    const map: Record<PipelineStage, string> = {
      prospect: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      qualified: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      engaged: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      demo: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
      proposal: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      procurement: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
      trial: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
      contract: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
      agreement: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
      onboarding: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200',
      live: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      lost: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
      dormant: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    };
    return map[s];
  };

  return (
    <div className="space-y-3">
      <TodaysQueueCard active={queueFilter} onChange={setQueueFilter} />
      <PipelineFunnelStrip
        activeStage={stageFilter}
        onStageClick={(s) => setStageFilter(s)}
      />
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agency, contact, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 w-64"
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="lead">Inbound</SelectItem>
            <SelectItem value="prospect">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={hasEmailOnly ? 'default' : 'outline'}
          onClick={() => setHasEmailOnly((v) => !v)}
          className="h-8"
        >
          <Mail className="h-3.5 w-3.5 mr-1" /> Has email
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {sorted.length} of {cards.length}
        </span>
      </div>

      {/* Bulk action bar */}
      <PipelineBulkActionsBar selected={selectedCards} onClear={() => setSelectedKeys(new Set())} />

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr className="text-left">
              <th className="p-2 w-8">
                <Checkbox
                  checked={allOnPageSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="p-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('agency')}>
                <span className="inline-flex items-center gap-1">Agency <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-2">Source</th>
              <th className="p-2">Stage</th>
              <th className="p-2">State</th>
              <th className="p-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('vouchers')}>
                <span className="inline-flex items-center gap-1">Vouchers <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-2">Contact</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Email</th>
              <th className="p-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('quote')}>
                <span className="inline-flex items-center gap-1">Quote / mo <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-2">Next action</th>
              <th className="p-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('days_in_stage')}>
                <span className="inline-flex items-center gap-1">Days <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-2 cursor-pointer hover:text-primary" onClick={() => toggleSort('next_action')}>
                <span className="inline-flex items-center gap-1">Next <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={14} className="p-8 text-center text-muted-foreground text-sm">
                  No matching deals. Try adjusting filters.
                </td>
              </tr>
            )}
            {sorted.map((c) => {
              const k = cardKey(c);
              const isSelected = selectedKeys.has(k);
              const overdue = c.next_action_at && new Date(c.next_action_at).getTime() < Date.now();
              return (
                <tr
                  key={k}
                  className={`border-t cursor-pointer hover:bg-muted/40 ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => setOpenCard(c)}
                >
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(c)} />
                  </td>
                  <td className="p-2 font-medium">{c.agency_name}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {c.source === 'lead' ? 'Inbound' : 'Outbound'}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor(c.stage)}`}>
                      {stageLabel(c.stage)}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {c.agency_state ? (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />{c.agency_state}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-2 tabular-nums">{c.voucher_count != null ? c.voucher_count.toLocaleString() : '—'}</td>
                  <td className="p-2 truncate max-w-[140px]">{c.contact_name ?? c.ed_name ?? '—'}</td>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    {c.contact_phone ? (
                      <a href={`tel:${c.contact_phone}`} className="text-primary hover:underline inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />{c.contact_phone}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-2 truncate max-w-[180px]" onClick={(e) => e.stopPropagation()}>
                    {c.contact_email ? (
                      <a href={`mailto:${c.contact_email}`} className="text-primary hover:underline truncate inline-block max-w-full">
                        {c.contact_email}
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-2 tabular-nums">
                    {(() => {
                      if (c.proposal_amount != null) {
                        const monthly = Number(c.proposal_amount);
                        return (
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium">${monthly.toLocaleString()}/mo</span>
                            {c.voucher_count ? (
                              <span className="text-[10px] text-muted-foreground">
                                ${(monthly / c.voucher_count).toFixed(2)}/vch/mo
                              </span>
                            ) : null}
                          </div>
                        );
                      }
                      const pr = pricingByKey.get(k);
                      if (pr?.hasData) {
                        return (
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-primary">${Math.round(pr.finalMonthly).toLocaleString()}/mo</span>
                            <span className="text-[10px] text-muted-foreground">
                              ${pr.finalPerVoucherMonthly.toFixed(2)}/vch/mo
                            </span>
                            <span className={`text-[9px] inline-flex w-fit px-1 rounded border mt-0.5 ${TIER_BADGE_CLASS[pr.tier]}`}>
                              {TIER_LABELS[pr.tier]}
                            </span>
                          </div>
                        );
                      }
                      return <span className="text-muted-foreground">—</span>;
                    })()}
                  </td>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    {c.stage !== 'lost' && c.stage !== 'live' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          // Advance one stage; opens convert wizard for agreement
                          const idx = PIPELINE_STAGES.findIndex((s) => s.id === c.stage);
                          const next = PIPELINE_STAGES[Math.min(idx + 1, PIPELINE_STAGES.length - 1)];
                          if (next && next.id !== 'lost') handleStageMove(c, next.id);
                        }}
                      >
                        {STAGE_NEXT_ACTION[c.stage]} →
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{STAGE_NEXT_ACTION[c.stage]}</span>
                    )}
                  </td>
                  <td className="p-2 tabular-nums text-muted-foreground">
                    {c.days_in_stage != null ? `${c.days_in_stage}d` : '—'}
                  </td>
                  <td className={`p-2 text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {c.next_action_at ? new Date(c.next_action_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {c.contact_email && (
                          <DropdownMenuItem onClick={() => setEmailCard(c)}>
                            <Mail className="h-3.5 w-3.5 mr-2" /> Send email
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); setSkipCard(c); }}>
                          <SkipForward className="h-3.5 w-3.5 mr-2" /> Skip stage with reason
                        </DropdownMenuItem>
                        {PIPELINE_STAGES.filter((s) => s.id !== c.stage).map((s) => (
                          <DropdownMenuItem key={s.id} onClick={() => handleStageMove(c, s.id)}>
                            Move to {s.label}{s.id === 'agreement' ? ' → Convert' : ''}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {emailCard && (
        <SendIntroEmailDialog
          open={!!emailCard}
          onOpenChange={(o) => { if (!o) setEmailCard(null); }}
          mode={emailCard.source === 'lead' ? 'lead' : 'prospect'}
          housingAuthorityId={
            emailCard.source === 'lead' ? emailCard.id : (emailCard.housing_authority_id ?? '')
          }
          authorityName={emailCard.agency_name}
          defaultRecipient={emailCard.contact_email ?? null}
          prospectId={emailCard.source === 'prospect' ? emailCard.id : null}
        />
      )}

      <DealWorkspaceDrawer
        card={openCard}
        open={!!openCard}
        onOpenChange={(o) => { if (!o) setOpenCard(null); }}
        onConvert={(c) => setConvertCard(c)}
      />

      <ConvertToCustomerWizard
        card={convertCard}
        open={!!convertCard}
        onOpenChange={(o) => { if (!o) setConvertCard(null); }}
        startStep={(convertCard?.conversion_step ?? 0) + 1 > 5 ? 5 : Math.max(1, (convertCard?.conversion_step ?? 0) + 1)}
      />

      <AdvanceStageDialog
        card={advanceCard?.card ?? null}
        toStage={advanceCard?.toStage ?? 'prospect'}
        open={!!advanceCard}
        onOpenChange={(o) => { if (!o) setAdvanceCard(null); }}
      />

      {skipCard && (() => {
        const idx = PIPELINE_STAGES.findIndex((s) => s.id === skipCard.stage);
        const next = PIPELINE_STAGES[Math.min(idx + 1, PIPELINE_STAGES.length - 1)];
        return (
          <SkipStageDialog
            open={!!skipCard}
            onOpenChange={(o) => { if (!o) setSkipCard(null); }}
            source={skipCard.source}
            recordId={skipCard.id}
            fromStage={skipCard.stage}
            toStage={next?.id || skipCard.stage}
          />
        );
      })()}
    </div>
  );
}
