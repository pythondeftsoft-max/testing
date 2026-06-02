import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Download, Flame, Filter, X, Users, Building2, Database, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommandCenterFilters } from '@/hooks/useMatchCommandCenter';
import type { ViewMode } from './GroupedMatchTable';

interface CommandControlBarProps {
  filters: CommandCenterFilters;
  updateFilter: <K extends keyof CommandCenterFilters>(key: K, value: CommandCenterFilters[K]) => void;
  clearFilters: () => void;
  filterOptions: {
    states: string[];
    cities: string[];
    bedrooms: number[];
    tenants: { id: string; name: string }[];
    properties: { id: string; address: string }[];
  };
  onSeed: () => void;
  onExport: () => void;
  isSeeding: boolean;
  matchCount: number;
  entityCount: number;
  computedAt?: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const CommandControlBar = ({
  filters,
  updateFilter,
  clearFilters,
  filterOptions,
  onSeed,
  onExport,
  isSeeding,
  matchCount,
  entityCount,
  computedAt,
  viewMode,
  onViewModeChange,
}: CommandControlBarProps) => {
  const hasActiveFilters = 
    filters.searchQuery.trim() ||
    filters.tenantId || 
    filters.propertyId || 
    filters.state || 
    filters.city || 
    filters.bedrooms ||
    filters.scoreThreshold > 0 ||
    filters.tierFilter !== 'all' ||
    filters.voucherOnly ||
    filters.needsReviewOnly;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-4 space-y-3">
      {/* Row 1: Entity Filters */}
      <div className="flex flex-wrap items-center gap-2">

        {/* View Mode Toggle */}
        <div className="flex items-center gap-0.5 border rounded-lg p-0.5 h-9">
          <Button
            variant={viewMode === 'tenant' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('tenant')}
            className="h-8 text-xs gap-1"
          >
            <Users className="w-3.5 h-3.5" />
            Tenants
          </Button>
          <Button
            variant={viewMode === 'property' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('property')}
            className="h-8 text-xs gap-1"
          >
            <Building2 className="w-3.5 h-3.5" />
            Properties
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={viewMode === 'tenant' ? 'Search tenant…' : 'Search property…'}
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="w-[200px] h-9 text-sm pl-8 pr-7"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {/* Tenant Dropdown */}
        <Select 
          value={filters.tenantId || '__all__'} 
          onValueChange={(v) => updateFilter('tenantId', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Tenants</SelectItem>
            {filterOptions.tenants.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Property Dropdown */}
        <Select 
          value={filters.propertyId || '__all__'} 
          onValueChange={(v) => updateFilter('propertyId', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Properties</SelectItem>
            {filterOptions.properties.map(p => (
              <SelectItem key={p.id} value={p.id} className="truncate">
                {p.address.length > 30 ? p.address.slice(0, 30) + '...' : p.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* State */}
        <Select 
          value={filters.state || '__all__'} 
          onValueChange={(v) => updateFilter('state', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[100px] h-9 text-sm">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All States</SelectItem>
            {filterOptions.states.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* City */}
        <Select 
          value={filters.city || '__all__'} 
          onValueChange={(v) => updateFilter('city', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Cities</SelectItem>
            {filterOptions.cities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Bedrooms */}
        <Select 
          value={filters.bedrooms || '__all__'} 
          onValueChange={(v) => updateFilter('bedrooms', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[100px] h-9 text-sm">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Beds</SelectItem>
            {filterOptions.bedrooms.map(b => (
              <SelectItem key={b} value={String(b)}>{b} BR</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Voucher Toggle */}
        <Button
          variant={filters.voucherOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilter('voucherOnly', !filters.voucherOnly)}
          className="h-9"
        >
          Voucher
        </Button>
      </div>
      
      {/* Row 2: Score Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Score Threshold */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Score ≥</span>
            <Slider
              value={[filters.scoreThreshold]}
              onValueChange={([v]) => updateFilter('scoreThreshold', v)}
              min={0}
              max={100}
              step={5}
              className="w-24"
            />
            <span className="text-xs font-mono w-6">{filters.scoreThreshold}</span>
          </div>
          
          {/* Tier Quick Filters */}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              variant={filters.tierFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('tierFilter', 'all')}
              className="h-7 text-xs"
            >
              All
            </Button>
            <Button
              variant={filters.tierFilter === 'decent_plus' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('tierFilter', 'decent_plus')}
              className="h-7 text-xs"
            >
              60+
            </Button>
            <Button
              variant={filters.tierFilter === 'hot' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('tierFilter', 'hot')}
              className="h-7 text-xs gap-1"
            >
              <Flame className="w-3 h-3" />
              HOT
            </Button>
          </div>
          
          {/* Needs Review */}
          <Button
            variant={filters.needsReviewOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('needsReviewOnly', !filters.needsReviewOnly)}
            className="h-8 text-xs gap-1"
          >
            <Filter className="w-3 h-3" />
            Needs Review
          </Button>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs gap-1 text-muted-foreground"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
        
        {/* Right side: Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{entityCount}</span>
            {' '}{viewMode === 'tenant' ? 'tenants' : 'properties'}
            <span className="mx-1">•</span>
            <span className="font-medium text-foreground">{matchCount}</span> matches
            {computedAt && (
              <span className="ml-2 text-xs">
                Seeded {new Date(computedAt).toLocaleString()}
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSeed}
            disabled={isSeeding}
            className="h-8 gap-1"
          >
            {isSeeding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Database className="w-3 h-3" />
            )}
            Seed Matches
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};
