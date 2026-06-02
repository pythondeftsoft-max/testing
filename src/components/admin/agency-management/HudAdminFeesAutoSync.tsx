import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Database, Upload, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { HudAdminFeesImporter } from './HudAdminFeesImporter';

export function HudAdminFeesAutoSync() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showFallback, setShowFallback] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['hud-admin-fees-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hud_admin_fee_rates')
        .select('pha_code, effective_date, updated_at, source_url')
        .order('updated_at', { ascending: false })
        .limit(1);
      const head = data?.[0];
      const { count } = await supabase
        .from('hud_admin_fee_rates')
        .select('*', { count: 'exact', head: true });
      // Count PHAs missing from HUD schedule (using fallback)
      const { count: totalActive } = await supabase
        .from('housing_authorities')
        .select('*', { count: 'exact', head: true })
        .eq('registry_status', 'active_hud');
      // Distinct matched pha_codes
      const matchedSet = new Set<string>();
      let from = 0;
      while (true) {
        const { data: page } = await supabase
          .from('hud_admin_fee_rates')
          .select('pha_code')
          .range(from, from + 999);
        if (!page || page.length === 0) break;
        page.forEach((r: any) => r.pha_code && matchedSet.add(r.pha_code));
        if (page.length < 1000) break;
        from += 1000;
      }
      return {
        total: count ?? 0,
        latestEffective: head?.effective_date ?? null,
        lastUpdated: head?.updated_at ?? null,
        sourceUrl: head?.source_url ?? null,
        totalActivePhas: totalActive ?? 0,
        matchedPhas: matchedSet.size,
      };
    },
    staleTime: 30_000,
  });

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-hud-admin-fees', { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Sync failed');
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: `Synced CY${data.year}`,
        description: `${data.inserted.toLocaleString()} rates loaded · ${data.matched.toLocaleString()} matched active PHAs`,
      });
      qc.invalidateQueries({ queryKey: ['hud-admin-fees-stats'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
    },
    onError: (e: any) =>
      toast({ title: 'Auto-sync failed', description: e.message, variant: 'destructive' }),
  });

  const sourceUrl =
    stats?.sourceUrl ??
    'https://www.hud.gov/sites/default/files/PIH/documents/CY_2025_Administrative_Fee_Rates.xlsx';

  const hasData = (stats?.total ?? 0) > 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">HUD Admin Fee Schedule</span>
              {hasData ? (
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  {stats!.total.toLocaleString()} rates loaded
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  Not loaded — wallets are using $85/unit fallback
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pulls Column A and Column B per-unit-month admin fees from HUD's annual PIH Notice. One click flips ~3,800 PHAs from fallback estimates to official HUD numbers, which makes every SaaS wallet quote accurate.
            </p>
            {hasData && stats!.totalActivePhas > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{stats!.matchedPhas.toLocaleString()}</span> of{' '}
                {stats!.totalActivePhas.toLocaleString()} active PHAs have a HUD rate ·{' '}
                <span className="text-amber-700 dark:text-amber-300">
                  {(stats!.totalActivePhas - stats!.matchedPhas).toLocaleString()} on $85/unit fallback
                </span>{' '}
                <span className="italic">(too small / unlisted / merged — set a manual quote per PHA)</span>
              </p>
            )}
            {stats?.lastUpdated && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Last sync {formatDistanceToNow(new Date(stats.lastUpdated), { addSuffix: true })}
                {stats.latestEffective && ` · effective ${stats.latestEffective}`}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Source:{' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                HUD CY 2025 Administrative Fee Rates
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Sync from HUD now
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowFallback((s) => !s)}>
              <Upload className="mr-1 h-3 w-3" />
              {showFallback ? 'Hide' : 'Manual CSV'}
            </Button>
          </div>
        </div>

        {showFallback && (
          <div className="rounded-md border border-dashed p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Fallback uploader if HUD changes URL structure. Supports CSVs with <code>pha_code, col_a_rate, col_b_rate, fmr_area</code> columns.
            </p>
            <HudAdminFeesImporter />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
