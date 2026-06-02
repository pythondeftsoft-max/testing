import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, Check, Search, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FilterOption } from '@/hooks/useTenantFilterOptions';

export type DaysLookingFilter = 'all' | 'new' | 'active' | 'stale' | 'cold';
export type VoucherFilter = 'all' | 'voucher' | 'no_voucher';
export type HousingStatusFilter = 'all' | 'unhoused' | 'expiring';
export type PushFilter = 'all' | 'never' | 'active' | 'expired_no_response';
export type SortBy = 'days_looking' | 'recent_signup' | 'voucher_amount' | 'match_count';

export interface TenantFilters {
  state: string;
  city: string;
  voucher: VoucherFilter;
  bedrooms: number[];
  rentMin: number;
  rentMax: number;
  daysLooking: DaysLookingFilter;
  housingStatus: HousingStatusFilter;
  pushed: PushFilter;
  housingAuthorityId: string;
  sortBy: SortBy;
}

export const DEFAULT_FILTERS: TenantFilters = {
  state: 'all',
  city: 'all',
  voucher: 'all',
  bedrooms: [],
  rentMin: 0,
  rentMax: 5000,
  daysLooking: 'all',
  housingStatus: 'all',
  pushed: 'all',
  housingAuthorityId: 'all',
  sortBy: 'days_looking',
};

interface TenantFilterBarProps {
  filters: TenantFilters;
  onChange: (filters: TenantFilters) => void;
  states: FilterOption[];
  cities: FilterOption[];
  housingAuthorities: FilterOption[];
  resultCount: number;
}

const BEDROOM_OPTIONS = [1, 2, 3, 4];

export const TenantFilterBar: React.FC<TenantFilterBarProps> = ({
  filters,
  onChange,
  states,
  cities,
  housingAuthorities,
  resultCount,
}) => {
  const [phaSearch, setPhaSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [phaOpen, setPhaOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<TenantFilters>) => onChange({ ...filters, ...patch });

  const activeCount = [
    filters.state !== 'all',
    filters.city !== 'all',
    filters.voucher !== 'all',
    filters.bedrooms.length > 0,
    filters.rentMin !== 0 || filters.rentMax !== 5000,
    filters.daysLooking !== 'all',
    filters.housingStatus !== 'all',
    filters.pushed !== 'all',
    filters.housingAuthorityId !== 'all',
  ].filter(Boolean).length;

  const reset = () => onChange(DEFAULT_FILTERS);

  const toggleBedroom = (br: number) => {
    const next = filters.bedrooms.includes(br)
      ? filters.bedrooms.filter(b => b !== br)
      : [...filters.bedrooms, br].sort();
    update({ bedrooms: next });
  };

  const filteredPhas = housingAuthorities.filter(p =>
    !phaSearch.trim() || p.label.toLowerCase().includes(phaSearch.toLowerCase())
  );
  const filteredCities = cities.filter(c =>
    !citySearch.trim() || c.label.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectedPha = housingAuthorities.find(p => p.value === filters.housingAuthorityId);
  const selectedCity = cities.find(c => c.value === filters.city);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="border-b">
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          <Select value={filters.sortBy} onValueChange={(v) => update({ sortBy: v as SortBy })}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days_looking">Sort: Days looking</SelectItem>
              <SelectItem value="recent_signup">Sort: Recent signup</SelectItem>
              <SelectItem value="voucher_amount">Sort: Voucher amount</SelectItem>
              <SelectItem value="match_count">Sort: Push activity</SelectItem>
            </SelectContent>
          </Select>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 text-xs gap-1">
              <X className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">
          {/* Row 1: State + City + PHA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight">State</Label>
              <Select value={filters.state} onValueChange={(v) => update({ state: v, city: 'all' })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight">City</Label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs font-normal">
                    <span className="truncate">{selectedCity?.label || 'All cities'}</span>
                    <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="flex items-center border-b px-2">
                    <Search className="w-3 h-3 opacity-50" />
                    <Input
                      placeholder="Search cities..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="border-0 focus-visible:ring-0 h-8 text-xs"
                    />
                  </div>
                  <ScrollArea className="max-h-[240px]">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"
                      onClick={() => { update({ city: 'all' }); setCityOpen(false); }}
                    >
                      <Check className={cn('w-3 h-3', filters.city === 'all' ? 'opacity-100' : 'opacity-0')} />
                      All cities
                    </button>
                    {filteredCities.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"
                        onClick={() => { update({ city: c.value }); setCityOpen(false); }}
                      >
                        <Check className={cn('w-3 h-3', filters.city === c.value ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1 truncate">{c.label}</span>
                        <span className="text-muted-foreground">{c.count}</span>
                      </button>
                    ))}
                    {filteredCities.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">No cities found</div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight">Housing Authority</Label>
              <Popover open={phaOpen} onOpenChange={setPhaOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs font-normal">
                    <span className="truncate">{selectedPha?.label || 'All PHAs'}</span>
                    <ChevronsUpDown className="w-3 h-3 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="flex items-center border-b px-2">
                    <Search className="w-3 h-3 opacity-50" />
                    <Input
                      placeholder="Search PHAs..."
                      value={phaSearch}
                      onChange={(e) => setPhaSearch(e.target.value)}
                      className="border-0 focus-visible:ring-0 h-8 text-xs"
                    />
                  </div>
                  <ScrollArea className="max-h-[240px]">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"
                      onClick={() => { update({ housingAuthorityId: 'all' }); setPhaOpen(false); }}
                    >
                      <Check className={cn('w-3 h-3', filters.housingAuthorityId === 'all' ? 'opacity-100' : 'opacity-0')} />
                      All PHAs
                    </button>
                    {filteredPhas.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center gap-2"
                        onClick={() => { update({ housingAuthorityId: p.value }); setPhaOpen(false); }}
                      >
                        <Check className={cn('w-3 h-3', filters.housingAuthorityId === p.value ? 'opacity-100' : 'opacity-0')} />
                        <span className="flex-1 truncate">{p.label}</span>
                        <span className="text-muted-foreground">{p.count}</span>
                      </button>
                    ))}
                    {filteredPhas.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">No PHAs found</div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Voucher + Days + Housing + Push (4 equal, fixed label height) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight min-h-[16px]">Voucher</Label>
              <Select value={filters.voucher} onValueChange={(v) => update({ voucher: v as VoucherFilter })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="voucher">Voucher holders</SelectItem>
                  <SelectItem value="no_voucher">Non-voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight min-h-[16px]">Days looking</Label>
              <Select value={filters.daysLooking} onValueChange={(v) => update({ daysLooking: v as DaysLookingFilter })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New (&lt;7d)</SelectItem>
                  <SelectItem value="active">Active (7–30d)</SelectItem>
                  <SelectItem value="stale">Stale (30–60d)</SelectItem>
                  <SelectItem value="cold">Cold (60d+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight min-h-[16px]">Housing status</Label>
              <Select value={filters.housingStatus} onValueChange={(v) => update({ housingStatus: v as HousingStatusFilter })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unhoused">Unhoused</SelectItem>
                  <SelectItem value="expiring">Lease ending ≤90d</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-0">
              <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight min-h-[16px]">Pushed to</Label>
              <Select value={filters.pushed} onValueChange={(v) => update({ pushed: v as PushFilter })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="never">Never pushed</SelectItem>
                  <SelectItem value="active">Has active push</SelectItem>
                  <SelectItem value="expired_no_response">Expired, no response</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Bedrooms (full width) */}
          <div className="flex flex-col min-w-0">
            <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight">Bedrooms approved</Label>
            <div className="flex flex-wrap gap-1">
              {BEDROOM_OPTIONS.map(br => (
                <button
                  key={br}
                  type="button"
                  onClick={() => toggleBedroom(br)}
                  className={cn(
                    'h-8 px-3 text-xs rounded-md border transition-colors',
                    filters.bedrooms.includes(br)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-input'
                  )}
                >
                  {br}{br === 4 ? '+' : ''} BR
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Rent slider (full width below bedrooms so it never gets cramped) */}
          <div className="flex flex-col min-w-0">
            <Label className="block mb-1.5 text-xs text-muted-foreground leading-tight">
              Rent: ${filters.rentMin.toLocaleString()} – ${filters.rentMax >= 5000 ? '5,000+' : filters.rentMax.toLocaleString()}
            </Label>
            <Slider
              min={0}
              max={5000}
              step={100}
              value={[filters.rentMin, filters.rentMax]}
              onValueChange={([min, max]) => update({ rentMin: min, rentMax: max })}
              className="mt-2"
            />
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            <span className="font-medium text-foreground">{resultCount}</span> tenant{resultCount !== 1 ? 's' : ''} match current filters
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
