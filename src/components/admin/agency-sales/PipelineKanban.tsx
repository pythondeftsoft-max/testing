import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Mail, MapPin, Clock, Phone } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SendIntroEmailDialog } from '@/components/admin/agency-management/SendIntroEmailDialog';
import { DealWorkspaceDrawer } from './DealWorkspaceDrawer';
import { ConvertToCustomerWizard } from './ConvertToCustomerWizard';
import {
  usePipelineCards,
  PIPELINE_STAGES,
  stageToLeadStatus,
  stageToProspectStatus,
  type PipelineCard,
  type PipelineStage,
} from './usePipelineData';

export default function PipelineKanban() {
  const { data: cards = [], isLoading } = usePipelineCards();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterSource, setFilterSource] = useState<'all' | 'lead' | 'prospect'>('all');
  const [emailCard, setEmailCard] = useState<PipelineCard | null>(null);
  const [openCard, setOpenCard] = useState<PipelineCard | null>(null);
  const [convertCard, setConvertCard] = useState<PipelineCard | null>(null);

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

  const grouped = useMemo(() => {
    const filtered = filterSource === 'all' ? cards : cards.filter((c) => c.source === filterSource);
    const map: Record<PipelineStage, PipelineCard[]> = {
      prospect: [], qualified: [], engaged: [], demo: [], procurement: [], trial: [],
      proposal: [], negotiation: [], contract: [], agreement: [], signed: [],
      onboarding: [], live: [], lost: [], dormant: [],
    };
    filtered.forEach((c) => map[c.stage].push(c));
    return map;
  }, [cards, filterSource]);

  const sourceCounts = useMemo(() => {
    const leads = cards.filter((c) => c.source === 'lead').length;
    const prospects = cards.filter((c) => c.source === 'prospect').length;
    const hidden =
      filterSource === 'lead' ? prospects :
      filterSource === 'prospect' ? leads : 0;
    return { leads, prospects, hidden };
  }, [cards, filterSource]);

  const stageCountsLine = useMemo(() => {
    return PIPELINE_STAGES
      .filter((s) => s.id !== 'lost')
      .map((s) => `${s.label} ${cards.filter((c) => c.stage === s.id).length}`)
      .join(' · ');
  }, [cards]);

  const moveCard = useMutation({
    mutationFn: async ({ card, to }: { card: PipelineCard; to: PipelineStage }) => {
      if (card.source === 'lead') {
        const { error } = await supabase
          .from('agency_leads')
          .update({ status: stageToLeadStatus(to) as any })
          .eq('id', card.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pha_prospect_status')
          .update({ status: stageToProspectStatus(to) as any })
          .eq('id', card.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Moved', description: `${vars.card.agency_name} → ${PIPELINE_STAGES.find((s) => s.id === vars.to)?.label}` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast({ title: 'Move failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Loading pipeline…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Source:</span>
        {(['all', 'lead', 'prospect'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterSource === s ? 'default' : 'outline'}
            onClick={() => setFilterSource(s)}
            className="h-7"
          >
            {s === 'all' ? 'All' : s === 'lead' ? 'Inbound' : 'Outbound'}
          </Button>
        ))}
        {sourceCounts.hidden > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="h-7"
            onClick={() => setFilterSource('all')}
          >
            Filter is hiding {sourceCounts.hidden} card{sourceCounts.hidden === 1 ? '' : 's'} — clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Inbound {sourceCounts.leads} · Outbound {sourceCounts.prospects} · Total {cards.length}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground px-1">{stageCountsLine}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const items = grouped[stage.id];
          const totalVouchers = items.reduce((s, c) => s + (c.voucher_count ?? 0), 0);
          const totalQuote = items.reduce((s, c) => s + (Number(c.proposal_amount) || 0), 0);
          return (
          <div key={stage.id} className="rounded-lg bg-muted/40 p-2 min-h-[180px]">
            <div className="mb-2 px-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              {(totalVouchers > 0 || totalQuote > 0) && (
                <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                  {totalVouchers > 0 && <span>{totalVouchers.toLocaleString()} vch</span>}
                  {totalQuote > 0 && <span>${totalQuote.toLocaleString()}/mo</span>}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {items.map((card) => (
                <Card
                  key={`${card.source}:${card.id}`}
                  className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setOpenCard(card)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-medium text-sm leading-tight flex-1 min-w-0">{card.agency_name}</div>
                      {(card.source === 'lead' ? !!card.contact_email : !!card.housing_authority_id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Send email"
                          onClick={(e) => { e.stopPropagation(); setEmailCard(card); }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {PIPELINE_STAGES.filter((s) => s.id !== stage.id).map((s) => (
                            <DropdownMenuItem
                              key={s.id}
                              onClick={() => {
                                if (s.id === 'agreement') setConvertCard(card);
                                moveCard.mutate({ card, to: s.id });
                              }}
                            >
                              Move to {s.label}{s.id === 'agreement' ? ' → Convert' : ''}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">
                        {card.source === 'lead' ? 'Inbound' : 'Outbound'}
                      </Badge>
                      {card.agency_state && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {card.agency_state}
                        </span>
                      )}
                      {card.voucher_count != null && (
                        <span className="font-medium">{card.voucher_count.toLocaleString()} vch</span>
                      )}
                    </div>
                    {(card.contact_name || card.ed_name) && (
                      <div className="text-xs text-foreground/80 truncate">
                        {card.contact_name ?? card.ed_name}
                      </div>
                    )}
                    {card.contact_phone && (
                      <a
                        href={`tel:${card.contact_phone}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{card.contact_phone}</span>
                      </a>
                    )}
                    {card.contact_email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{card.contact_email}</span>
                      </div>
                    )}
                    {card.proposal_amount != null && (
                      <div className="text-xs font-semibold text-primary">
                        ${Number(card.proposal_amount).toLocaleString()}/mo
                      </div>
                    )}
                    {card.next_action_at && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        Follow-up {new Date(card.next_action_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground/60 text-center py-6 border border-dashed border-muted-foreground/20 rounded-md">
                  Empty
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {emailCard && (
        <SendIntroEmailDialog
          open={!!emailCard}
          onOpenChange={(o) => { if (!o) setEmailCard(null); }}
          mode={emailCard.source === 'lead' ? 'lead' : 'prospect'}
          housingAuthorityId={
            emailCard.source === 'lead'
              ? emailCard.id
              : (emailCard.housing_authority_id ?? '')
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
        startStep={Math.max(1, Math.min(6, (convertCard?.conversion_step ?? 0) + 1))}
      />
    </div>
  );
}
