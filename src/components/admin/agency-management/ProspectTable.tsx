import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, MoreHorizontal, Mail, Plus, Clock, ExternalLink, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABELS } from '@/lib/prospectScoring';
import { FitScoreCell } from './FitScoreCell';
import { PricingChip } from './PricingChip';
import { TechStackChips } from './TechStackChips';
import { SendIntroEmailDialog } from './SendIntroEmailDialog';
import type { ProspectRow } from '@/hooks/useProspects';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  rows: ProspectRow[];
  onSelect: (row: ProspectRow) => void;
  selectedId?: string | null;
}

export function ProspectTable({ rows, onSelect, selectedId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [emailRow, setEmailRow] = useState<ProspectRow | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page when totalPages shrinks (e.g., row removed/filtered out).
  // Don't auto-reset to page 1 on every total change — that yanks the user
  // back to the top after actions like "Add to pipeline" trigger a refetch.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visible = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const jumpToDeal = (prospectId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'agency-sales');
    params.set('sub', 'pipeline');
    params.set('deal', `prospect:${prospectId}`);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const pushToPipeline = useMutation({
    mutationFn: async (row: ProspectRow) => {
      const { data: existing } = await supabase
        .from('pha_prospect_status')
        .select('id')
        .eq('housing_authority_id', row.id)
        .maybeSingle();
      if (existing?.id) return { existed: true, prospectId: existing.id };
      const user = (await supabase.auth.getUser()).data.user;
      const newStatus = row.prospect?.status && row.prospect.status !== 'cold' ? row.prospect.status : 'researching';
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
      toast({
        title: result.existed ? 'Already in pipeline' : 'Added to pipeline',
        description: result.existed
          ? 'Use "Open in pipeline" to view the deal.'
          : "Open Sales → Pipeline when you're ready.",
      });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const snoozeWeek = useMutation({
    mutationFn: async (row: ProspectRow) => {
      const user = (await supabase.auth.getUser()).data.user;
      const next = new Date();
      next.setDate(next.getDate() + 7);
      const { error } = await supabase.from('pha_prospect_status').upsert(
        {
          housing_authority_id: row.id,
          status: row.prospect?.status ?? 'researching',
          next_action_at: next.toISOString(),
          owner_user_id: row.prospect?.owner_user_id ?? user?.id ?? null,
        },
        { onConflict: 'housing_authority_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: 'Snoozed 7 days' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto max-w-md space-y-2">
          <div className="text-base font-medium">No PHAs match your filters</div>
          <p className="text-sm text-muted-foreground">
            Try a different preset (e.g. "Sweet spot" or "$10K+ greenfield"), clear the state filter,
            or run enrichment above to populate voucher counts, admin budgets, and tech stack.
          </p>
        </div>
      </div>
    );
  }

  const renderDueBadge = (nextAt: string | null | undefined) => {
    if (!nextAt) return null;
    const ms = new Date(nextAt).getTime();
    const now = Date.now();
    const days = Math.round((ms - now) / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return <Badge variant="destructive" className="ml-1 text-[10px]">Overdue {Math.abs(days)}d</Badge>;
    }
    if (days <= 7) {
      return <Badge className="ml-1 text-[10px] bg-amber-500 hover:bg-amber-500/90">Due {days}d</Badge>;
    }
    return null;
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Fit</TableHead>
                <TableHead className="min-w-[200px]">Authority</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="text-right">Vouchers</TableHead>
                <TableHead className="min-w-[140px]">SaaS wallet</TableHead>
                <TableHead className="hidden xl:table-cell">SEMAP</TableHead>
                <TableHead className="hidden xl:table-cell text-right">Util %</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[160px]">Tech / portal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden 2xl:table-cell">Last touch</TableHead>
                <TableHead className="w-[90px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const status = row.prospect?.status ?? 'cold';
                const util = row.enrichment?.utilization_pct;
                const recipient = row.ed_email ?? row.email ?? null;
                return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer ${selectedId === row.id ? 'bg-muted/50' : ''}`}
                    onClick={() => onSelect(row)}
                  >
                    <TableCell>
                      <FitScoreCell scoring={row.scoring} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {row.name}
                        {row.is_archived && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">archived</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.pha_code}
                        {row.registry_status === 'stale_hud' && (
                          <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">Stale</span>
                        )}
                        {row.registry_status === 'manual' && (
                          <span className="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-700 dark:text-blue-400">Manual</span>
                        )}
                        {row.mtw && (
                          <span className="ml-2 rounded bg-purple-500/15 px-1.5 py-0.5 text-purple-700 dark:text-purple-300">
                            MTW
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {row.city ? `${row.city}, ${row.state}` : row.state ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.voucher_count != null ? row.voucher_count.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <PricingChip
                        adminFeeColA={row.enrichment?.admin_fee_col_a}
                        adminFeeColB={row.enrichment?.admin_fee_col_b}
                        leasedUnits={row.enrichment?.leased_units ?? row.voucher_count}
                        isMtw={row.mtw}
                        fallbackAdminBudget={(row.enrichment as any)?.estimated_admin_budget_fallback ?? null}
                        compact
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {row.semap_score ?? '—'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-right font-mono text-sm">
                      {util != null ? (
                        <span className={util < 90 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                          {util.toFixed(0)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <TechStackChips
                        software={row.enrichment?.detected_software}
                        paymentMethod={row.enrichment?.detected_payment_method}
                        hasOnlinePortal={row.enrichment?.has_online_portal}
                        portalVendor={row.enrichment?.portal_vendor}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge variant={status === 'customer' ? 'default' : 'secondary'}>
                          {STATUS_LABELS[status]}
                        </Badge>
                        {renderDueBadge(row.prospect?.next_action_at)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-xs text-muted-foreground">
                      {row.prospect?.last_contacted_at
                        ? formatDistanceToNow(new Date(row.prospect.last_contacted_at), {
                            addSuffix: true,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {row.prospect?.id && status !== 'cold' && status !== 'researching' ? (
                              <DropdownMenuItem onClick={() => jumpToDeal(row.prospect!.id)}>
                                <ExternalLink className="mr-2 h-3 w-3" /> Open in pipeline
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => pushToPipeline.mutate(row)}>
                                <Plus className="mr-2 h-3 w-3" /> Add to pipeline
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              disabled={!recipient}
                              onClick={() => setEmailRow(row)}
                            >
                              <Mail className="mr-2 h-3 w-3" /> Send intro email
                              {!recipient && <span className="ml-auto text-[10px] text-muted-foreground">no email</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => snoozeWeek.mutate(row)}>
                              <Clock className="mr-2 h-3 w-3" /> Snooze 7 days
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onSelect(row)}>
                              <ExternalLink className="mr-2 h-3 w-3" /> Open details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelect(row)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-2 border-t p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing <span className="font-medium text-foreground">{startIdx.toLocaleString()}–{endIdx.toLocaleString()}</span> of{' '}
            <span className="font-medium text-foreground">{total.toLocaleString()}</span> PHAs
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-1">
                <span>Page</span>
                <Select value={String(page)} onValueChange={(v) => setPage(Number(v))}>
                  <SelectTrigger className="h-7 w-[64px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>of {totalPages.toLocaleString()}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {emailRow && (
        <SendIntroEmailDialog
          open={!!emailRow}
          onOpenChange={(o) => !o && setEmailRow(null)}
          housingAuthorityId={emailRow.id}
          authorityName={emailRow.name}
          defaultRecipient={emailRow.ed_email ?? emailRow.email}
          prospectId={emailRow.prospect?.id}
        />
      )}
    </>
  );
}
