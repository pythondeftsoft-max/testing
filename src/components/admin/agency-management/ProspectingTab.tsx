import { useMemo, useState } from 'react';
import { useProspects, DEFAULT_FILTERS, type ProspectFilters, type ProspectRow } from '@/hooks/useProspects';
import { ProspectFiltersBar } from './ProspectFilters';
import { ProspectTable } from './ProspectTable';
import { ProspectDetailDrawer } from './ProspectDetailDrawer';
import { HudCsvImporter } from './HudCsvImporter';
import { EnrichmentPanel } from './EnrichmentPanel';
import { PhaCoveragePanel } from './PhaCoveragePanel';
import { MetricsGlossary } from './MetricsGlossary';
import { HudAdminFeesAutoSync } from './HudAdminFeesAutoSync';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Target, Trophy, Phone, AlertTriangle, Settings, ChevronDown } from 'lucide-react';

export default function ProspectingTab() {
  const [filters, setFilters] = useState<ProspectFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<ProspectRow | null>(null);
  const [open, setOpen] = useState(false);
  const [dataOpsOpen, setDataOpsOpen] = useState(false);

  const { data: rows = [], isLoading } = useProspects(filters);

  const stats = useMemo(() => {
    const ideal = rows.filter((r) => r.scoring.tier === 'ideal').length;
    const inFlight = rows.filter(
      (r) => r.prospect && !['cold', 'customer', 'not_a_fit', 'dormant'].includes(r.prospect.status)
    ).length;
    const customers = rows.filter((r) => r.prospect?.status === 'customer' || r.is_onboarded).length;
    const missingData = rows.filter((r) => r.voucher_count == null).length;
    return { ideal, inFlight, customers, missingData };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Prospecting</h2>
          <p className="text-sm text-muted-foreground">
            Workbench for prioritizing PHAs to reach out to. Pick a quick preset (Sweet spot,
            Troubled SEMAP, MTW…) or refine manually. PHAs are scored 0–100 based on voucher count,
            SEMAP performance, MTW status, and city population.
          </p>
        </div>
        <Button
          variant={dataOpsOpen ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setDataOpsOpen((v) => !v)}
          className="shrink-0"
        >
          <Settings className="mr-1.5 h-3.5 w-3.5" />
          Data sources
          <ChevronDown
            className={`ml-1.5 h-3.5 w-3.5 transition-transform ${dataOpsOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Trophy} value={stats.ideal} label="Ideal-fit (in view)" />
        <StatCard icon={Phone} value={stats.inFlight} label="In active pipeline" />
        <StatCard icon={Target} value={stats.customers} label="Already customers" />
        <StatCard icon={AlertTriangle} value={stats.missingData} label="Missing voucher data" muted />
      </div>

      <MetricsGlossary />

      <Collapsible open={dataOpsOpen} onOpenChange={setDataOpsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Data sources & sync</span>
              <span className="hidden text-xs text-muted-foreground md:inline">
                HUD roster · Auto-enrich · Admin fees · Subsidized households
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                dataOpsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <PhaCoveragePanel />
          <EnrichmentPanel />
          <HudAdminFeesAutoSync />
          <HudCsvImporter />
        </CollapsibleContent>
      </Collapsible>

      <ProspectFiltersBar
        value={filters}
        onChange={setFilters}
        total={rows.length + (filters.hideCustomers ? stats.customers : 0)}
        filtered={rows.length}
      />

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PHAs…
        </div>
      ) : (
        <ProspectTable
          rows={rows}
          selectedId={selected?.id}
          onSelect={(r) => {
            setSelected(r);
            setOpen(true);
          }}
        />
      )}

      <ProspectDetailDrawer row={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${muted ? 'bg-muted' : 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${muted ? 'text-muted-foreground' : 'text-primary'}`} />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
