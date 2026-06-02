import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, User, MapPin, Home, DollarSign, Ticket, ChevronLeft, ChevronRight, Clock, Hourglass, Send, Building2 } from 'lucide-react';
import { FinderTenant } from '@/hooks/usePropertyFinder';
import { TenantFilterBar, TenantFilters, DEFAULT_FILTERS } from './TenantFilterBar';
import { useTenantFilterOptions } from '@/hooks/useTenantFilterOptions';
import { cn } from '@/lib/utils';

interface TenantFinderListProps {
  tenants: FinderTenant[];
  selectedTenant: FinderTenant | null;
  onSelectTenant: (tenant: FinderTenant) => void;
  isLoading: boolean;
  filters: TenantFilters;
  onFiltersChange: (filters: TenantFilters) => void;
}

const ITEMS_PER_PAGE = 10;

export const TenantFinderList: React.FC<TenantFinderListProps> = ({
  tenants,
  selectedTenant,
  onSelectTenant,
  isLoading,
  filters,
  onFiltersChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filterOptions = useTenantFilterOptions(tenants);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const today = new Date();
    const ninetyOut = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    let list = tenants.filter(tenant => {
      // search
      if (query) {
        const inSearch =
          tenant.full_name.toLowerCase().includes(query) ||
          tenant.city.toLowerCase().includes(query) ||
          tenant.email.toLowerCase().includes(query) ||
          tenant.zip_code.includes(query);
        if (!inSearch) return false;
      }
      // state
      if (filters.state !== 'all' && tenant.state !== filters.state) return false;
      // city
      if (filters.city !== 'all') {
        const key = `${tenant.city}|${tenant.state || ''}`;
        if (key !== filters.city) return false;
      }
      // voucher
      if (filters.voucher === 'voucher' && !tenant.voucher_holder) return false;
      if (filters.voucher === 'no_voucher' && tenant.voucher_holder) return false;
      // bedrooms (any overlap)
      if (filters.bedrooms.length > 0) {
        const overlap = tenant.bedrooms_approved.some(b =>
          filters.bedrooms.includes(b >= 4 ? 4 : b)
        );
        if (!overlap) return false;
      }
      // rent: include if tenant range overlaps the filter range
      if (filters.rentMin > 0 || filters.rentMax < 5000) {
        const tMin = tenant.rent_range_min || 0;
        const tMax = tenant.rent_range_max || 99999;
        const overlap = tMax >= filters.rentMin && tMin <= filters.rentMax;
        if (!overlap) return false;
      }
      // days looking
      const d = tenant.days_looking || 0;
      if (filters.daysLooking === 'new' && d >= 7) return false;
      if (filters.daysLooking === 'active' && (d < 7 || d > 30)) return false;
      if (filters.daysLooking === 'stale' && (d < 30 || d > 60)) return false;
      if (filters.daysLooking === 'cold' && d < 60) return false;
      // housing status
      if (filters.housingStatus === 'unhoused' && tenant.is_housed) return false;
      if (filters.housingStatus === 'expiring') {
        if (!tenant.is_housed || !tenant.lease_end_date) return false;
        const end = new Date(tenant.lease_end_date);
        if (end > ninetyOut) return false;
      }
      // pushed
      if (filters.pushed === 'never' && tenant.push_stats.total > 0) return false;
      if (filters.pushed === 'active' && tenant.push_stats.pending === 0 && tenant.push_stats.interested === 0) return false;
      if (filters.pushed === 'expired_no_response' && tenant.push_stats.expired === 0) return false;
      // PHA
      if (filters.housingAuthorityId !== 'all' && tenant.housing_authority_id !== filters.housingAuthorityId) return false;
      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      switch (filters.sortBy) {
        case 'recent_signup':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'voucher_amount':
          return (b.voucher_amount || 0) - (a.voucher_amount || 0);
        case 'match_count':
          return b.push_stats.total - a.push_stats.total;
        case 'days_looking':
        default:
          return (b.days_looking || 0) - (a.days_looking || 0);
      }
    });

    return list;
  }, [tenants, searchQuery, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

  // Reset page when filters/search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilters = (next: TenantFilters) => {
    onFiltersChange(next);
    setCurrentPage(1);
  };

  const getDaysUntilLeaseEnd = (leaseEndDate: string | null): number | null => {
    if (!leaseEndDate) return null;
    const end = new Date(leaseEndDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysLookingBadgeClass = (days: number, hours: number): string => {
    if (days >= 60) return "text-red-600 border-red-300 bg-red-50";
    if (days >= 30) return "text-amber-600 border-amber-300 bg-amber-50";
    if (days >= 1) return "text-blue-600 border-blue-300 bg-blue-50";
    if (hours >= 12) return "text-blue-600 border-blue-300 bg-blue-50";
    return "text-green-600 border-green-300 bg-green-50";
  };

  const formatLookingTime = (days: number, hours: number): string => {
    if (days >= 1) return `${days}d looking`;
    if (hours >= 1) return `${hours}h looking`;
    return 'Just started';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={cn(
      "px-3 py-2 flex items-center justify-between",
      position === 'top' ? 'border-b' : 'border-t'
    )}>
      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1">
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
      <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1">
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''} found
          {filteredTenants.length > ITEMS_PER_PAGE && (
            <span> · Showing {startIndex + 1}-{Math.min(endIndex, filteredTenants.length)}</span>
          )}
        </p>
      </div>

      {/* Filter bar (collapsible) */}
      <TenantFilterBar
        filters={filters}
        onChange={handleFilters}
        states={filterOptions.states}
        cities={filterOptions.cities}
        housingAuthorities={filterOptions.housingAuthorities}
        resultCount={filteredTenants.length}
      />

      {/* Top Pagination */}
      {totalPages > 1 && <PaginationControls position="top" />}

      {/* Tenant List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {paginatedTenants.map((tenant) => {
            const daysUntilEnd = getDaysUntilLeaseEnd(tenant.lease_end_date);
            const pushTotal = tenant.push_stats.total;

            return (
              <div
                key={tenant.id}
                onClick={() => onSelectTenant(tenant)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                  selectedTenant?.id === tenant.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tenant.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {tenant.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className={cn("text-xs flex items-center gap-1", getDaysLookingBadgeClass(tenant.days_looking ?? 0, tenant.hours_looking ?? 0))}>
                      <Hourglass className="w-3 h-3" />
                      {formatLookingTime(tenant.days_looking ?? 0, tenant.hours_looking ?? 0)}
                    </Badge>
                    {tenant.voucher_holder && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Ticket className="w-3 h-3" />
                        Voucher
                      </Badge>
                    )}
                    {daysUntilEnd !== null && daysUntilEnd <= 90 && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 text-amber-600 border-amber-300">
                        <Clock className="w-3 h-3" />
                        {daysUntilEnd <= 0 ? 'Lease ended' : `${daysUntilEnd}d left`}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {tenant.city !== 'N/A' ? tenant.city : ''}{tenant.state ? `, ${tenant.state}` : ''}
                      {tenant.zip_code !== 'N/A' ? ` ${tenant.zip_code}` : ''}
                    </span>
                  </div>
                  {tenant.housing_authority_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{tenant.housing_authority_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Home className="w-3 h-3" />
                    <span>
                      {tenant.bedrooms_approved.length > 0
                        ? `${tenant.bedrooms_approved.join(', ')} BR`
                        : 'Any BR'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3" />
                    <span>
                      ${tenant.rent_range_min.toLocaleString()} - ${tenant.rent_range_max.toLocaleString()}
                    </span>
                  </div>
                  {pushTotal > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Send className="w-3 h-3 text-primary" />
                      <span className="text-foreground/80">
                        {pushTotal} push{pushTotal !== 1 ? 'es' : ''}
                        {tenant.push_stats.pending > 0 && ` · ${tenant.push_stats.pending} pending`}
                        {tenant.push_stats.interested > 0 && ` · ${tenant.push_stats.interested} interested`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTenants.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tenants found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && <PaginationControls position="bottom" />}
    </div>
  );
};
