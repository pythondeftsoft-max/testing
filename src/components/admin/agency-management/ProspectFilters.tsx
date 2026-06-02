import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronDown, X, Sparkles, Search, Plus, Bookmark, BookmarkPlus, Check, Clock } from 'lucide-react';
import type { ProspectFilters } from '@/hooks/useProspects';
import { DEFAULT_FILTERS, FILTER_PRESETS } from '@/hooks/useProspects';
import { useToast } from '@/hooks/use-toast';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR'
];

const REGIONS: Record<string, string[]> = {
  West: ['WA','OR','CA','NV','ID','MT','WY','UT','CO','AZ','NM','AK','HI'],
  Midwest: ['ND','SD','NE','KS','MN','IA','MO','WI','IL','MI','IN','OH'],
  South: ['TX','OK','AR','LA','MS','AL','TN','KY','FL','GA','SC','NC','VA','WV','DC','MD','DE','PR'],
  Northeast: ['ME','VT','NH','MA','RI','CT','NY','NJ','PA'],
};

const VOUCHER_CHIPS: Array<{ label: string; min: number; max: number }> = [
  { label: '<100', min: 0, max: 100 },
  { label: '100–500', min: 100, max: 500 },
  { label: '500–1.5K', min: 500, max: 1500 },
  { label: '1.5K–5K', min: 1500, max: 5000 },
];

interface SavedView {
  id: string;
  name: string;
  filters: ProspectFilters;
}
const SAVED_VIEWS_KEY = 'prospecting:saved_views';

interface Props {
  value: ProspectFilters;
  onChange: (next: ProspectFilters) => void;
  total: number;
  filtered: number;
}

function activePresetId(v: ProspectFilters): string | null {
  for (const p of FILTER_PRESETS) {
    const matches = Object.entries(p.patch).every(([k, val]) => {
      const cur = (v as any)[k];
      if (Array.isArray(val)) return Array.isArray(cur) && cur.length === val.length && cur.every((x) => val.includes(x));
      return cur === val;
    });
    if (matches) return p.id;
  }
  return null;
}

function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function ProspectFiltersBar({ value, onChange, total, filtered }: Props) {
  const { toast } = useToast();
  const [refineOpen, setRefineOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews());

  useEffect(() => {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const set = (patch: Partial<ProspectFilters>) => onChange({ ...value, ...patch });

  const toggleState = (s: string) => {
    const next = value.states.includes(s)
      ? value.states.filter((x) => x !== s)
      : [...value.states, s];
    set({ states: next });
  };
  const addRegion = (region: string) => {
    const set_ = new Set([...value.states, ...REGIONS[region]]);
    set({ states: Array.from(set_) });
  };
  const toggleSemap = (s: string) => {
    const next = value.semap.includes(s)
      ? value.semap.filter((x) => x !== s)
      : [...value.semap, s];
    set({ semap: next });
  };

  const activeId = activePresetId(value);
  const ratio = total > 0 ? filtered / total : 0;
  const countTone =
    filtered === 0
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : ratio < 0.05
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : ratio < 0.5
      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';

  // ---- Active filter summary chips ----
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (value.states.length > 0) {
      chips.push({
        key: 'states',
        label: `States: ${value.states.slice(0, 3).join(', ')}${value.states.length > 3 ? ` +${value.states.length - 3}` : ''}`,
        clear: () => set({ states: [] }),
      });
    }
    if (value.voucherMin !== 0 || value.voucherMax !== 5000) {
      chips.push({
        key: 'vouchers',
        label: `${value.voucherMin.toLocaleString()}–${value.voucherMax.toLocaleString()} vouchers`,
        clear: () => set({ voucherMin: 0, voucherMax: 5000 }),
      });
    }
    if (value.populationMin !== 0 || value.populationMax !== 2_000_000) {
      chips.push({
        key: 'pop',
        label: `Pop: ${value.populationMin.toLocaleString()}–${value.populationMax.toLocaleString()}`,
        clear: () => set({ populationMin: 0, populationMax: 2_000_000 }),
      });
    }
    if (value.semap.length > 0) {
      chips.push({ key: 'semap', label: `SEMAP: ${value.semap.join(', ')}`, clear: () => set({ semap: [] }) });
    }
    if (value.mtwOnly) chips.push({ key: 'mtw', label: 'MTW only', clear: () => set({ mtwOnly: false }) });
    if (value.noPortalOnly) chips.push({ key: 'noportal', label: 'No portal', clear: () => set({ noPortalOnly: false }) });
    if (value.minSaasWallet > 0) {
      chips.push({
        key: 'wallet',
        label: `Wallet ≥ $${(value.minSaasWallet / 1000).toFixed(0)}K`,
        clear: () => set({ minSaasWallet: 0 }),
      });
    }
    if (value.dataQuality !== 'all') {
      chips.push({ key: 'dq', label: `Data: ${value.dataQuality}`, clear: () => set({ dataQuality: 'all' }) });
    }
    if (value.dueOnly) {
      chips.push({ key: 'due', label: 'Due / overdue', clear: () => set({ dueOnly: false }) });
    }
    return chips;
  }, [value]);

  const saveCurrentView = () => {
    const name = window.prompt('Name this view:', '');
    if (!name?.trim()) return;
    const view: SavedView = { id: crypto.randomUUID(), name: name.trim(), filters: value };
    setSavedViews([...savedViews, view]);
    toast({ title: 'View saved', description: name.trim() });
  };
  const deleteView = (id: string) => setSavedViews(savedViews.filter((v) => v.id !== id));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Row 1: search + count + reset + save */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, city, ZIP, PHA code…"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className={countTone}>
          {filtered.toLocaleString()} of {total.toLocaleString()}
        </Badge>
        <Button variant="outline" size="sm" onClick={saveCurrentView} title="Save current filters">
          <BookmarkPlus className="mr-1 h-3 w-3" /> Save view
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
          <X className="mr-1 h-3 w-3" /> Reset
        </Button>
      </div>

      {/* Row 2: PROMOTED — state combobox + voucher range */}
      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        {/* States combobox */}
        <div className="min-w-[260px] flex-1">
          <Label className="mb-1.5 block text-xs text-muted-foreground">States</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {value.states.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="cursor-pointer gap-1 pr-1"
                onClick={() => toggleState(s)}
              >
                {s} <X className="h-3 w-3" />
              </Badge>
            ))}
            <Popover open={stateOpen} onOpenChange={setStateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7">
                  <Plus className="mr-1 h-3 w-3" /> Add states
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Type a state…" />
                  <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup heading="Regions">
                      {Object.keys(REGIONS).map((r) => (
                        <CommandItem key={r} onSelect={() => addRegion(r)}>
                          <Plus className="mr-2 h-3 w-3" /> Add {r} ({REGIONS[r].length})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="States">
                      {US_STATES.map((s) => {
                        const active = value.states.includes(s);
                        return (
                          <CommandItem key={s} onSelect={() => toggleState(s)}>
                            <Check className={`mr-2 h-3 w-3 ${active ? 'opacity-100' : 'opacity-0'}`} />
                            {s}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {value.states.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => set({ states: [] })}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Voucher range (numeric) */}
        <div className="min-w-[260px]">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Voucher count</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={5000}
              placeholder="Min"
              value={value.voucherMin || ''}
              onChange={(e) => set({ voucherMin: Math.max(0, Number(e.target.value || 0)) })}
              className="h-8 w-24"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              max={5000}
              placeholder="Max"
              value={value.voucherMax === 5000 ? '' : value.voucherMax}
              onChange={(e) => set({ voucherMax: Math.min(5000, Number(e.target.value || 5000)) })}
              className="h-8 w-24"
            />
            <div className="flex flex-wrap gap-1">
              {VOUCHER_CHIPS.map((c) => {
                const active = value.voucherMin === c.min && value.voucherMax === c.max;
                return (
                  <Badge
                    key={c.label}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => set({ voucherMin: c.min, voucherMax: c.max })}
                  >
                    {c.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick presets + saved views */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Quick presets
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, search: value.search, hideCustomers: value.hideCustomers, ...p.patch })}
              title={p.description}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeId === p.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
          {savedViews.map((v) => (
            <span
              key={v.id}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-background pr-1 text-xs hover:bg-muted"
            >
              <button
                type="button"
                onClick={() => onChange(v.filters)}
                className="flex items-center gap-1 px-3 py-1"
              >
                <Bookmark className="h-3 w-3" /> {v.name}
              </button>
              <button
                type="button"
                onClick={() => deleteView(v.id)}
                className="rounded-full p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-destructive/20"
                title="Delete view"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Registry status filter */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
        <Label className="text-muted-foreground">Registry:</Label>
        {[
          { id: 'active_hud', label: 'Active HUD' },
          { id: 'stale_hud', label: 'Stale (not in HUD)' },
          { id: 'manual', label: 'Manual / non-federal' },
          { id: 'unknown', label: 'Unlabeled' },
        ].map((opt) => {
          const active = value.registryStatuses.includes(opt.id);
          return (
            <Badge
              key={opt.id}
              variant={active ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                const next = active
                  ? value.registryStatuses.filter((s) => s !== opt.id)
                  : [...value.registryStatuses, opt.id];
                set({ registryStatuses: next });
              }}
            >
              {opt.label}
            </Badge>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={value.showArchived}
            onCheckedChange={(c) => set({ showArchived: c })}
          />
          <Label htmlFor="show-archived" className="cursor-pointer text-xs">Show archived</Label>
        </div>
      </div>

      {/* Common toggles */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Switch id="hide-customers" checked={value.hideCustomers} onCheckedChange={(c) => set({ hideCustomers: c })} />
          <Label htmlFor="hide-customers" className="cursor-pointer text-sm">Hide customers</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="hide-unknown" checked={value.hideUnknownVouchers} onCheckedChange={(c) => set({ hideUnknownVouchers: c })} />
          <Label htmlFor="hide-unknown" className="cursor-pointer text-sm">Require voucher data</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="mtw-only" checked={value.mtwOnly} onCheckedChange={(c) => set({ mtwOnly: c })} />
          <Label htmlFor="mtw-only" className="cursor-pointer text-sm">MTW only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="no-portal" checked={value.noPortalOnly} onCheckedChange={(c) => set({ noPortalOnly: c })} />
          <Label htmlFor="no-portal" className="cursor-pointer text-sm">No portal (greenfield)</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="due-only" checked={value.dueOnly} onCheckedChange={(c) => set({ dueOnly: c })} />
          <Label htmlFor="due-only" className="cursor-pointer text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" /> Due / overdue
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Min wallet:</Label>
          <Select
            value={String(value.minSaasWallet)}
            onValueChange={(v) => set({ minSaasWallet: parseInt(v, 10) })}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="5000">$5K+</SelectItem>
              <SelectItem value="10000">$10K+</SelectItem>
              <SelectItem value="25000">$25K+</SelectItem>
              <SelectItem value="50000">$50K+</SelectItem>
              <SelectItem value="100000">$100K+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Data:</Label>
          <Select value={value.dataQuality} onValueChange={(v) => set({ dataQuality: v as any })}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quality levels</SelectItem>
              <SelectItem value="verified">HUD-verified only</SelectItem>
              <SelectItem value="estimated">Population estimates</SelectItem>
              <SelectItem value="unknown">No data</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter summary */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-3 text-xs">
          <span className="text-muted-foreground">Active:</span>
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1"
              onClick={chip.clear}
            >
              {chip.label} <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Refine (collapsible) — population, SEMAP slider for voucher fine-tune */}
      <Collapsible open={refineOpen} onOpenChange={setRefineOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 px-0">
            <ChevronDown className={`h-4 w-4 transition-transform ${refineOpen ? 'rotate-180' : ''}`} />
            {refineOpen ? 'Hide' : 'Refine'} (population, SEMAP, voucher slider)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs">
                Voucher slider: {value.voucherMin.toLocaleString()} – {value.voucherMax.toLocaleString()}
              </Label>
              <Slider
                min={0}
                max={5000}
                step={50}
                value={[value.voucherMin, value.voucherMax]}
                onValueChange={(v) => set({ voucherMin: v[0], voucherMax: v[1] })}
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs">
                Population: {value.populationMin.toLocaleString()} – {value.populationMax.toLocaleString()}
                {value.populationMin === 0 && value.populationMax === 2_000_000 && (
                  <span className="ml-2 text-muted-foreground">(any)</span>
                )}
              </Label>
              <Slider
                min={0}
                max={2_000_000}
                step={5000}
                value={[value.populationMin, value.populationMax]}
                onValueChange={(v) => set({ populationMin: v[0], populationMax: v[1] })}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">SEMAP performance</Label>
            <div className="flex flex-wrap gap-2">
              {['Standard', 'Troubled', 'High Performer'].map((s) => (
                <Badge
                  key={s}
                  variant={value.semap.includes(s) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSemap(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
