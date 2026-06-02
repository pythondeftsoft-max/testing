import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useMarketplaceAudit, MarketplaceAuditEvent } from '@/hooks/useMarketplaceAudit';
import { format } from 'date-fns';
import { Search, Eye, FileText, CheckCircle, DollarSign, Home, UserCheck, MousePointerClick, Filter, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const eventTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  guard_shown: { label: 'Guard Shown', icon: Eye, color: 'text-muted-foreground' },
  opt_in_clicked: { label: 'Opt-In Clicked', icon: UserCheck, color: 'text-blue-600' },
  access_granted: { label: 'Access Granted', icon: CheckCircle, color: 'text-green-600' },
  search_view_loaded: { label: 'Search View', icon: Search, color: 'text-purple-600' },
  search_performed: { label: 'Search Performed', icon: Search, color: 'text-purple-700' },
  card_shown: { label: 'Property Viewed', icon: Eye, color: 'text-indigo-600' },
  cta_clicked: { label: 'CTA Clicked', icon: MousePointerClick, color: 'text-orange-600' },
  application_started: { label: 'App Started', icon: FileText, color: 'text-yellow-600' },
  application_submitted: { label: 'App Submitted', icon: FileText, color: 'text-yellow-700' },
  match_approved: { label: 'Match Approved', icon: CheckCircle, color: 'text-green-700' },
  lease_signed: { label: 'Lease Signed', icon: FileText, color: 'text-blue-700' },
  payment_received: { label: 'Payment Received', icon: DollarSign, color: 'text-green-800' },
  move_in_completed: { label: 'Moved In', icon: Home, color: 'text-emerald-600' },
  property_pipeline_change: { label: 'Pipeline Change', icon: ArrowRight, color: 'text-cyan-600' },
};

export function MarketplaceAuditTable() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data, isLoading } = useMarketplaceAudit({
    eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const columns: ColumnDef<MarketplaceAuditEvent>[] = [
    {
      accessorKey: 'created_at',
      header: 'Date & Time',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{format(new Date(row.original.created_at), 'MMM d, yyyy')}</div>
          <div className="text-muted-foreground">{format(new Date(row.original.created_at), 'h:mm a')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'event_type',
      header: 'Event Type',
      cell: ({ row }) => {
        const eventConfig = eventTypeLabels[row.original.event_type] || {
          label: row.original.event_type,
          icon: FileText,
          color: 'text-muted-foreground',
        };
        const Icon = eventConfig.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${eventConfig.color}`} />
            <span className="font-medium">{eventConfig.label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.user_name || 'System'}</div>
          <div className="text-muted-foreground text-xs">{row.original.user_email || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'property_address',
      header: 'Property',
      cell: ({ row }) => (
        <div className="text-sm max-w-xs truncate">
          {row.original.property_address || row.original.metadata?.property_address || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'metadata',
      header: 'Details',
      cell: ({ row }) => {
        const meta = row.original.metadata || {};
        const details = [];
        
        // For pipeline changes, show stage transition
        if (row.original.event_type === 'property_pipeline_change') {
          if (meta.previous_stage && meta.new_stage) {
            details.push(`${meta.previous_stage} → ${meta.new_stage}`);
          } else if (meta.new_stage) {
            details.push(`New stage: ${meta.new_stage}`);
          }
          if (meta.on_market !== undefined) {
            details.push(meta.on_market ? 'Listed' : 'Unlisted');
          }
        } else {
          if (meta.business_phase) details.push(`Phase: ${meta.business_phase}`);
          if (meta.tenant_type) details.push(`Type: ${meta.tenant_type}`);
          if (meta.match_id) details.push(`Match: ${meta.match_id.slice(0, 8)}`);
        }
        
        return (
          <div className="text-xs text-muted-foreground max-w-xs truncate">
            {details.length > 0 ? details.join(' • ') : '—'}
          </div>
        );
      },
    },
  ];

  const filteredEvents = data?.events.filter(event => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      event.user_email?.toLowerCase().includes(searchLower) ||
      event.user_name?.toLowerCase().includes(searchLower) ||
      event.property_address?.toLowerCase().includes(searchLower) ||
      event.event_type.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalItems = filteredEvents?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, eventTypeFilter, startDate, endDate]);

  // Helper function for page numbers with ellipses
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.applicationsSubmitted || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.applicationsStarted || 0} started
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.matchesApproved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.matchesPaid || 0} paid • {stats?.matchesMovedIn || 0} moved in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.searchViews || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.cardShows || 0} properties viewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="User, property, or event..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {Object.entries(eventTypeLabels).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {(eventTypeFilter || searchFilter || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEventTypeFilter('');
                setSearchFilter('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Marketplace Activity Log</span>
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} events
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pagination Controls - Top */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-4">
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((pageNum, idx) => (
                    <PaginationItem key={idx}>
                      {pageNum === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum as number)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Data Table */}
          <DataTable columns={columns} data={paginatedEvents} />

          {/* Pagination Controls - Bottom */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="flex justify-center pt-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((pageNum, idx) => (
                    <PaginationItem key={idx}>
                      {pageNum === '...' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum as number)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Empty State */}
          {totalItems === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No events found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
