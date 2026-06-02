import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Globe2,
  Search,
  Plus,
  Archive,
  Tag,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  usePhaCoverage,
  useRefreshPhaCoverage,
  useBackfillMissingPhas,
  useAddPhaManually,
  useReconcileStatus,
  useRegistryStatusCounts,
  useStalePhas,
  useUpdatePhaStatus,
} from '@/hooks/usePhaCoverage';
import { useToast } from '@/hooks/use-toast';

const TERRITORY_STATES = new Set(['PR', 'VI', 'GU', 'MP', 'AS']);

export function PhaCoveragePanel() {
  const { data, isLoading, error } = usePhaCoverage();
  const refresh = useRefreshPhaCoverage();
  const backfill = useBackfillMissingPhas();
  const addManual = useAddPhaManually();
  const reconcile = useReconcileStatus();
  const { data: counts } = useRegistryStatusCounts();
  const { toast } = useToast();

  const [missingOpen, setMissingOpen] = useState(false);
  const [staleOpen, setStaleOpen] = useState(false);
  const [missingSearch, setMissingSearch] = useState('');
  const [staleSearch, setStaleSearch] = useState('');
  const [hideTerritories, setHideTerritories] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const stale = useStalePhas(staleOpen);
  const updateStatus = useUpdatePhaStatus();

  // Manual-add form state
  const [form, setForm] = useState({
    pha_code: '',
    name: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    total_units: '',
  });

  const territoryCount = useMemo(
    () => (data?.missing ?? []).filter((m) => TERRITORY_STATES.has(m.state)).length,
    [data?.missing],
  );

  const filteredMissing = useMemo(() => {
    if (!data?.missing) return [];
    const q = missingSearch.trim().toLowerCase();
    return data.missing.filter((m) => {
      if (hideTerritories && TERRITORY_STATES.has(m.state)) return false;
      if (!q) return true;
      return (
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.state.toLowerCase().includes(q)
      );
    });
  }, [data?.missing, missingSearch, hideTerritories]);

  const topGapStates = useMemo(() => {
    if (!data?.by_state) return [];
    return data.by_state.filter((s) => s.gap > 0).slice(0, 6);
  }, [data?.by_state]);

  const pct = data && data.hud_total > 0 ? data.our_total / data.hud_total : 0;
  const pctRound = Math.round(pct * 100);
  const complete = data && data.our_total >= data.hud_total;
  const missingCount = data ? Math.max(0, data.hud_total - data.our_total) : 0;
  const mainlandMissing = missingCount - territoryCount;

  const handleBackfill = () => {
    backfill.mutate(undefined, {
      onSuccess: (r) => {
        toast({
          title: 'Backfill complete',
          description: `Added ${r.inserted.toLocaleString()} PHAs (of ${r.candidates.toLocaleString()} candidates). Coverage refreshed.`,
        });
      },
      onError: (e: any) =>
        toast({ title: 'Backfill failed', description: e.message, variant: 'destructive' }),
    });
  };

  const handleAddManual = () => {
    addManual.mutate(
      {
        pha_code: form.pha_code,
        name: form.name,
        city: form.city,
        state: form.state,
        zip: form.zip,
        phone: form.phone,
        email: form.email,
        total_units: form.total_units ? parseInt(form.total_units, 10) : null,
      },
      {
        onSuccess: (r: any) => {
          toast({
            title: 'PHA added',
            description: `${r.pha_code} — ${r.name} is now in the registry.`,
          });
          setAddOpen(false);
          setForm({
            pha_code: '',
            name: '',
            city: '',
            state: '',
            zip: '',
            phone: '',
            email: '',
            total_units: '',
          });
        },
        onError: (e: any) =>
          toast({ title: 'Could not add PHA', description: e.message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-2">
            <Globe2 className="mt-0.5 h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">HUD roster coverage</span>
                {isLoading && (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking HUD…
                  </Badge>
                )}
                {data && complete && (
                  <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {data.hud_total.toLocaleString()} / {data.hud_total.toLocaleString()} active HUD PHAs (100%)
                  </Badge>
                )}
                {data && complete && data.our_total > data.hud_total && (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    +{(data.our_total - data.hud_total).toLocaleString()} legacy/stale
                  </Badge>
                )}
                {data && !complete && (
                  <Badge variant="outline" className="gap-1 border-amber-500/50 font-normal text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    {data.our_total.toLocaleString()} / {data.hud_total.toLocaleString()} ({pctRound}%) — {missingCount.toLocaleString()} missing
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Compares our <code>housing_authorities</code> table against the live HUD ArcGIS PHA roster — the federal source of truth (3,780 active PHAs nationwide; this is the complete universe of traditional Section 8/Public Housing agencies).
                {data && (
                  <>
                    {' '}Last checked {formatDistanceToNow(new Date(data.checked_at), { addSuffix: true })}.
                  </>
                )}
              </div>
              {data && !complete && missingCount > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <strong>{missingCount.toLocaleString()} missing</strong> —{' '}
                  {territoryCount.toLocaleString()} in territories (PR/VI/GU/MP),{' '}
                  {mainlandMissing.toLocaleString()} in mainland states.
                </div>
              )}
              {data && !complete && (
                <div className="mt-2">
                  <Progress value={pctRound} />
                </div>
              )}
              {topGapStates.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">States with gaps:</span>
                  {topGapStates.map((s) => (
                    <Badge key={s.state} variant="outline" className="font-normal">
                      {s.state} {s.ours}/{s.hud}
                    </Badge>
                  ))}
                </div>
              )}
              {error && (
                <div className="mt-2 text-xs text-destructive">
                  Failed to load coverage: {(error as Error).message}
                </div>
              )}
              {counts && (counts.active_hud + counts.stale_hud + counts.manual + counts.unknown) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Labels:</span>
                  <Badge variant="outline" className="font-normal">
                    Active HUD: <span className="ml-1 font-semibold">{counts.active_hud.toLocaleString()}</span>
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`font-normal ${counts.stale_hud > 0 ? 'cursor-pointer border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10' : ''}`}
                          onClick={() => counts.stale_hud > 0 && setStaleOpen(true)}
                        >
                          Stale: <span className="ml-1 font-semibold">{counts.stale_hud.toLocaleString()}</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Not in HUD's live PHA roster: usually closed/merged agencies, renamed codes, state finance agencies, or municipal sub-recipients. Still useful prospects, just not HUD-crosswalkable.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="font-normal">
                    Manual: <span className="ml-1 font-semibold">{counts.manual.toLocaleString()}</span>
                  </Badge>
                  {counts.unknown > 0 && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Unlabeled: <span className="ml-1 font-semibold">{counts.unknown.toLocaleString()}</span>
                    </Badge>
                  )}
                  {counts.archived > 0 && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Archived: <span className="ml-1 font-semibold">{counts.archived.toLocaleString()}</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data && missingCount > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => setMissingOpen(true)}>
                  View missing ({missingCount.toLocaleString()})
                </Button>
                <Button size="sm" onClick={handleBackfill} disabled={backfill.isPending}>
                  {backfill.isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Backfill missing PHAs
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add manually
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                reconcile.mutate(undefined, {
                  onSuccess: (r) =>
                    toast({
                      title: 'Reconciliation complete',
                      description: `Active HUD: ${r.active_hud.toLocaleString()} · Stale: ${r.stale_hud.toLocaleString()} · Manual: ${r.manual.toLocaleString()}`,
                    }),
                  onError: (e: any) =>
                    toast({ title: 'Reconcile failed', description: e.message, variant: 'destructive' }),
                })
              }
              disabled={reconcile.isPending}
            >
              {reconcile.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Tag className="mr-1 h-3 w-3" />
              )}
              Reconcile labels
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              {refresh.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Re-check
            </Button>
          </div>
        </div>

        {/* Missing PHAs dialog */}
        <Dialog open={missingOpen} onOpenChange={setMissingOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Missing PHAs ({missingCount.toLocaleString()})</DialogTitle>
              <DialogDescription>
                These PHAs exist in HUD's federal roster but not yet in our database. Click <strong>Backfill</strong> on the panel to insert all of them, or use <strong>Add manually</strong> for PHAs that aren't in HUD's data (like state/county/municipal housing offices).
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={missingSearch}
                  onChange={(e) => setMissingSearch(e.target.value)}
                  placeholder="Filter by code, name, or state…"
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="hide-territories"
                  checked={hideTerritories}
                  onCheckedChange={setHideTerritories}
                />
                <Label htmlFor="hide-territories" className="text-xs">
                  Hide territories ({territoryCount})
                </Label>
              </div>
            </div>
            <ScrollArea className="h-[400px] rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissing.map((m) => (
                    <tr key={m.code} className="border-t">
                      <td className="px-3 py-1.5 font-mono text-xs">{m.code}</td>
                      <td className="px-3 py-1.5">{m.name}</td>
                      <td className="px-3 py-1.5">{m.state}</td>
                    </tr>
                  ))}
                  {filteredMissing.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                        No missing PHAs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
            {data && data.missing.length >= 1000 && (
              <div className="text-xs text-muted-foreground">
                Showing first 1,000 missing. Backfill to see the full list.
              </div>
            )}
            <DialogFooter>
              <div className="mr-auto text-xs text-muted-foreground">
                Don't see one (e.g. Long Beach NY)? It's likely not in HUD's federal roster.
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setMissingOpen(false);
                  setAddOpen(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add manually
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add manually dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a PHA manually</DialogTitle>
              <DialogDescription>
                For agencies not in HUD's federal roster (e.g. state-administered, county, or municipal housing offices). The PHA code must be unique.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <Label htmlFor="pha_code" className="text-xs">PHA code *</Label>
                <Input
                  id="pha_code"
                  value={form.pha_code}
                  onChange={(e) => setForm({ ...form, pha_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. NY999"
                  className="font-mono"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="state" className="text-xs">State *</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  placeholder="e.g. NY"
                  maxLength={2}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="name" className="text-xs">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. City of Long Beach Housing Authority"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="city" className="text-xs">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Long Beach"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="zip" className="text-xs">ZIP</Label>
                <Input
                  id="zip"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  placeholder="e.g. 11561"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="phone" className="text-xs">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@pha.gov"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="total_units" className="text-xs">Total units (optional)</Label>
                <Input
                  id="total_units"
                  type="number"
                  value={form.total_units}
                  onChange={(e) => setForm({ ...form, total_units: e.target.value })}
                  placeholder="e.g. 450"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddManual} disabled={addManual.isPending}>
                {addManual.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Add PHA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stale codes dialog */}
        <Dialog open={staleOpen} onOpenChange={setStaleOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Stale HUD codes ({counts?.stale_hud.toLocaleString() ?? '…'})</DialogTitle>
              <DialogDescription>
                These PHAs use a HUD-format code (e.g. <code>NY001</code>) but no longer appear in HUD's current ArcGIS roster — likely consolidated, dissolved, or recoded. They may still be valid sales prospects (state/county takeovers, rebranded agencies), so you can keep them as <strong>Manual</strong> leads or <strong>Archive</strong> them out of the prospect view.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={staleSearch}
                onChange={(e) => setStaleSearch(e.target.value)}
                placeholder="Filter by code, name, or state…"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <ScrollArea className="h-[420px] rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Location</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(stale.data ?? [])
                    .filter((s) => {
                      const q = staleSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        s.pha_code.toLowerCase().includes(q) ||
                        s.name.toLowerCase().includes(q) ||
                        (s.state ?? '').toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                      <tr key={s.id} className={`border-t ${s.is_archived ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-1.5 font-mono text-xs">{s.pha_code}</td>
                        <td className="px-3 py-1.5">{s.name}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {[s.city, s.state].filter(Boolean).join(', ')}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              updateStatus.mutate({ id: s.id, registry_status: 'manual' })
                            }
                            disabled={s.is_archived}
                          >
                            <Tag className="mr-1 h-3 w-3" />
                            Keep as lead
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              updateStatus.mutate({
                                id: s.id,
                                is_archived: !s.is_archived,
                              })
                            }
                          >
                            <Archive className="mr-1 h-3 w-3" />
                            {s.is_archived ? 'Restore' : 'Archive'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {(!stale.data || stale.data.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        {stale.isLoading ? 'Loading…' : 'No stale codes found. Click "Reconcile labels" to refresh.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
