import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, RefreshCw, Database, Play, AlertTriangle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEnrichmentCoverage } from '@/hooks/useEnrichmentCoverage';

interface EnrichmentPanelProps {
  autoEnrichBelow?: number;
}

export function EnrichmentPanel({ autoEnrichBelow = 0.05 }: EnrichmentPanelProps = {}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { data: coverage, refetch: refetchCoverage } = useEnrichmentCoverage();
  const autoStartedRef = useRef(false);

  const { data: latestJob, refetch } = useQuery({
    queryKey: ['pha-enrichment-jobs', activeJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pha_enrichment_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: activeJobId ? 3000 : false,
  });

  // Aggregate which sources contributed across the most recent enrichment rows
  const { data: sourceBreakdown } = useQuery({
    queryKey: ['pha-enrichment-source-breakdown'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('pha_enrichment')
        .select('source_breakdown')
        .not('source_breakdown', 'is', null)
        .order('enriched_at', { ascending: false })
        .limit(500);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const sb = r.source_breakdown ?? {};
        const seen = new Set<string>();
        Object.values(sb).forEach((src: any) => {
          if (typeof src === 'string' && !seen.has(src)) {
            seen.add(src);
            counts[src] = (counts[src] ?? 0) + 1;
          }
        });
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    },
    staleTime: 60_000,
  });

  // Stop polling when job completes / fails / pauses (chunk finished, may auto-chain a new job)
  useEffect(() => {
    if (!latestJob) return;
    const terminal = ['completed', 'failed', 'paused', 'stalled'];
    if (terminal.includes(latestJob.status)) {
      if (activeJobId === latestJob.id) {
        setActiveJobId(null);
        qc.invalidateQueries({ queryKey: ['admin-prospects'] });
        refetchCoverage();
        if (latestJob.status === 'completed' || latestJob.status === 'failed') {
          toast({
            title: latestJob.status === 'completed' ? 'Enrichment complete' : 'Enrichment failed',
            description: `${latestJob.updated_count} PHAs updated · ${latestJob.error_count} errors`,
          });
        }
      }
    }
  }, [latestJob, activeJobId, qc, toast, refetchCoverage]);

  // Defensive: auto-cancel any running job that has had no heartbeat for >15 minutes.
  // Catches the "0/0 running forever" case where the work block crashed before
  // ever updating total_count.
  const autoCancelledRef = useRef(false);
  useEffect(() => {
    if (autoCancelledRef.current) return;
    if (!latestJob || latestJob.status !== 'running') return;
    const lastBeat = (latestJob as any).heartbeat_at ?? latestJob.updated_at ?? latestJob.started_at;
    if (!lastBeat) return;
    const ageMs = Date.now() - new Date(lastBeat).getTime();
    if (ageMs > 15 * 60 * 1000) {
      autoCancelledRef.current = true;
      supabase
        .from('pha_enrichment_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          errors: [{ fatal: 'Auto-cancelled: stalled with no heartbeat for >15 min' }],
        })
        .eq('id', latestJob.id)
        .then(() => refetch());
    }
  }, [latestJob, refetch]);

  const cancelJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pha_enrichment_jobs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          errors: [{ fatal: 'Manually cancelled by admin' }],
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveJobId(null);
      refetch();
      toast({ title: 'Stalled job cancelled', description: 'You can start a fresh enrichment now.' });
    },
  });

  // Auto-start a "fill missing" sync once if registry coverage is below threshold
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!coverage) return;
    if (coverage.total === 0) return;
    if (latestJob?.status === 'running') return;
    if (coverage.pct < autoEnrichBelow) {
      autoStartedRef.current = true;
      start.mutate({ mode: 'missing' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverage, latestJob?.status, autoEnrichBelow]);

  const start = useMutation({
    mutationFn: async (opts: { mode: 'all' | 'missing'; resumeJobId?: string; startOffset?: number }) => {
      const { data, error } = await supabase.functions.invoke('enrich-pha-registry', {
        body: {
          mode: opts.mode,
          enrichPopulation: true,
          batchSize: 250,
          resumeJobId: opts.resumeJobId,
          startOffset: opts.startOffset,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Failed to start');
      return data.job_id as string;
    },
    onSuccess: (jobId) => {
      setActiveJobId(jobId);
      refetch();
      toast({ title: 'Enrichment started', description: 'Processing next chunk of 250 PHAs…' });
    },
    onError: (e: any) =>
      toast({ title: 'Failed to start enrichment', description: e.message, variant: 'destructive' }),
  });

  const isRunning = latestJob?.status === 'running' || start.isPending;
  const pct =
    latestJob && latestJob.total_count > 0
      ? Math.round((latestJob.processed_count / latestJob.total_count) * 100)
      : 0;

  // A "stalled" job is one we can resume from its checkpoint.
  const lastHeartbeat = (latestJob as any)?.heartbeat_at ?? latestJob?.updated_at ?? latestJob?.started_at;
  const heartbeatAgeMs = lastHeartbeat ? Date.now() - new Date(lastHeartbeat).getTime() : 0;
  const isStaleRunning = latestJob?.status === 'running' && heartbeatAgeMs > 5 * 60 * 1000;
  const canResume =
    latestJob &&
    (latestJob.status === 'paused' || latestJob.status === 'stalled' || latestJob.status === 'failed' || isStaleRunning) &&
    latestJob.total_count > 0 &&
    latestJob.processed_count < latestJob.total_count;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Auto-enrich PHA registry</span>
                {coverage && (
                  <>
                    <Badge variant="outline" className="gap-1 font-normal" title="Rows with any HUD-derived field on the registry (population, voucher count, MTW, SEMAP)">
                      <Database className="h-3 w-3" />
                      Registry: {coverage.enriched.toLocaleString()} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.pct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="Rows with any HUD unit signal: HCV vouchers, Section 8 units, total units, or PSH total units">
                      <Database className="h-3 w-3" />
                      Units: {coverage.withVoucherEnriched.toLocaleString()} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.voucherPct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="Rows with SEMAP score from pha_enrichment">
                      <Database className="h-3 w-3" />
                      SEMAP: {coverage.withSemap.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.semapPct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="PHAs with HUD admin fee schedule rates loaded — unlocks SaaS wallet estimates">
                      <Database className="h-3 w-3" />
                      Admin fees: {coverage.withAdminFees.toLocaleString()} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.adminFeePct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title={`Wallet estimates available. Official (HUD fee schedule): ${coverage.withOfficialWallet?.toLocaleString() ?? 0}. Fallback ($85/unit/month): ${coverage.withFallbackWallet?.toLocaleString() ?? 0}.`}>
                      <Database className="h-3 w-3" />
                      SaaS wallet: {coverage.withSaasWalletEstimate.toLocaleString()} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.saasWalletPct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="Active PHAs where leased and authorized voucher counts are both known — utilization % can be computed.">
                      <Database className="h-3 w-3" />
                      Utilization: {coverage.withVoucherUtilization?.toLocaleString() ?? 0} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round((coverage.utilizationPct ?? 0) * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="Active PHAs with a website URL on file (inferred from ED email domain or HUD ArcGIS).">
                      <Sparkles className="h-3 w-3" />
                      Websites: {coverage.withWebsiteUrl.toLocaleString()} / {coverage.total.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.websitePct * 100)}%)</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal" title="Per-PHA Firecrawl website scan completed.">
                      <Sparkles className="h-3 w-3" />
                      Web scanned: {coverage.withWebIntel.toLocaleString()}
                      <span className="text-muted-foreground">({Math.round(coverage.webPct * 100)}%)</span>
                    </Badge>
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Runs in chunks of 250. Progress is saved after every batch — if it stops you can resume from the last checkpoint without redoing earlier rows.
                {coverage && coverage.rawTotal > coverage.total && (
                  <> · Denominator: <strong>{coverage.total.toLocaleString()}</strong> active HUD PHAs ({(coverage.rawTotal - coverage.total).toLocaleString()} stale rows excluded).</>
                )}
              </div>
              {coverage?.lastRun?.finishedAt && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(new Date(coverage.lastRun.finishedAt), { addSuffix: true })} · {coverage.lastRun.updated.toLocaleString()} rows updated
                </div>
              )}
              {coverage && coverage.voucherPct < 0.5 && coverage.lastRun && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Unit coverage is thin.</span>{' '}
                    Only {coverage.withVoucherEnriched.toLocaleString()} of {coverage.total.toLocaleString()} PHAs have any HUD unit signal. Re-run enrichment to backfill from the HUD PHA registry.
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canResume && (() => {
              // Best-known checkpoint: pick the largest signal so legacy jobs
              // (cursor_offset = 0, pre-resumable migration) still resume correctly.
              const resumeFrom = Math.max(
                ((latestJob as any).cursor_offset as number) ?? 0,
                (latestJob!.processed_count as number) ?? 0,
                (latestJob!.updated_count as number) ?? 0,
              );
              return (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() =>
                    start.mutate({
                      mode: (latestJob!.mode as 'all' | 'missing') ?? 'missing',
                      resumeJobId: latestJob!.id,
                      startOffset: resumeFrom,
                    })
                  }
                  disabled={start.isPending}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Resume from {resumeFrom.toLocaleString()}
                </Button>
              );
            })()}
            <Button
              size="sm"
              variant="outline"
              onClick={() => start.mutate({ mode: 'missing' })}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Fill missing (250)
            </Button>
            <Button size="sm" onClick={() => start.mutate({ mode: 'all' })} disabled={isRunning}>
              <Sparkles className="mr-1 h-3 w-3" />
              Re-enrich next 250
            </Button>
          </div>
        </div>

        {isStaleRunning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <div className="font-semibold text-amber-700 dark:text-amber-400">This job appears stalled.</div>
              <div className="text-muted-foreground">
                {latestJob!.processed_count.toLocaleString()} of {latestJob!.total_count.toLocaleString()} rows were saved. No
                progress for {Math.round(heartbeatAgeMs / 60000)} min. Click <span className="font-medium text-foreground">Resume</span> to continue from the last checkpoint, or cancel to start fresh.
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => cancelJob.mutate(latestJob!.id)}
              disabled={cancelJob.isPending}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel job
            </Button>
          </div>
        )}

        {latestJob && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={latestJob.status === 'completed' ? 'default' : 'secondary'}>
                  {latestJob.status}
                </Badge>
                <span className="text-muted-foreground">{latestJob.mode} mode</span>
                <span className="text-muted-foreground">
                  · started {formatDistanceToNow(new Date(latestJob.started_at), { addSuffix: true })}
                </span>
                {(latestJob as any).last_processed_pha_code && (
                  <span className="text-muted-foreground">· last PHA {(latestJob as any).last_processed_pha_code}</span>
                )}
              </div>
              <span className="font-mono">
                {latestJob.processed_count.toLocaleString()} / {latestJob.total_count.toLocaleString()}
              </span>
            </div>
            <Progress value={pct} />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Updated: <span className="font-semibold text-foreground">{latestJob.updated_count}</span></span>
              <span>Errors: <span className="font-semibold text-foreground">{latestJob.error_count}</span></span>
            </div>
          </div>
        )}

        {sourceBreakdown && sourceBreakdown.length > 0 && (
          <div className="space-y-1 rounded-md border border-dashed bg-background/50 p-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Live data sources contributing (from last 500 enrichment rows)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sourceBreakdown.map(([src, count]) => (
                <Badge key={src} variant="outline" className="font-normal text-[11px]">
                  {src} <span className="ml-1 text-muted-foreground">×{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
