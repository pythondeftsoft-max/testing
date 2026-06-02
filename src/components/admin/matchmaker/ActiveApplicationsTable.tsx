import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, X, Loader2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import ApplicationsTable from '@/components/applications/ApplicationsTable';
import { getStatusBadge, formatDate } from '@/components/applications/ApplicationsUtils';
import { useActiveApplications } from '@/hooks/useActiveApplications';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';

interface ActiveApplicationsTableProps {
  statusFilter?: string;
  onClearFilter?: () => void;
}

export const ActiveApplicationsTable = ({ statusFilter, onClearFilter }: ActiveApplicationsTableProps) => {
  const [filterApplied, setFilterApplied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const { data: applications, isLoading } = useActiveApplications({ statusFilter });

  // Create wrapper function for old signature
  const getStatusBadgeWrapper = (status: string, priorityPayment: boolean) => {
    return getStatusBadge({
      status,
      priority_payment: priorityPayment,
    });
  };

  useEffect(() => {
    if (statusFilter) {
      setFilterApplied(true);
    }
  }, [statusFilter]);

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'housed': 'Housed'
    };
    return status ? labels[status] || status : 'All';
  };

  // Transform data for ApplicationsTable component
  const transformedApplications = applications?.map(app => ({
    id: app.id,
    tenant_id: app.user_id,
    property_id: app.property_id,
    unit_id: app.unit_id,
    status: app.status,
    priority_payment_made: app.priority_payment_made,
    created_at: app.created_at,
    profiles: {
      first_name: app.user.first_name,
      last_name: app.user.last_name,
      email: app.user.email,
    },
    properties: {
      address: `${app.property.street_address}, ${app.property.city}, ${app.property.state} ${app.property.zipcode}`,
      monthly_rent: app.unit?.monthly_rent || 0,
    },
  })) || [];

  // Apply filters and sorting
  const filteredApplications = transformedApplications
    .filter(app => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTenant = 
          app.profiles.first_name.toLowerCase().includes(search) ||
          app.profiles.last_name.toLowerCase().includes(search) ||
          app.profiles.email.toLowerCase().includes(search);
        const matchesProperty = app.properties.address.toLowerCase().includes(search);
        if (!matchesTenant && !matchesProperty) return false;
      }
      
      // Status filter
      if (localStatusFilter !== 'all' && app.status !== localStatusFilter) {
        return false;
      }
      
      // Priority filter
      if (priorityOnly && !app.priority_payment_made) {
        return false;
      }
      
      // Date range filter
      if (dateRange !== 'all') {
        const appDate = new Date(app.created_at);
        const now = new Date();
        const daysDiff = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dateRange === 'today' && daysDiff > 1) return false;
        if (dateRange === 'week' && daysDiff > 7) return false;
        if (dateRange === 'month' && daysDiff > 30) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'tenant') {
        return `${a.profiles.first_name} ${a.profiles.last_name}`.localeCompare(
          `${b.profiles.first_name} ${b.profiles.last_name}`
        );
      }
      if (sortBy === 'property') {
        return a.properties.address.localeCompare(b.properties.address);
      }
      if (sortBy === 'status') {
        const statusOrder = { pending: 0, under_review: 1, approved: 2 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      }
      return 0;
    });

  // Pagination calculations
  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, localStatusFilter, priorityOnly, dateRange, sortBy]);

  const hasActiveFilters = searchTerm || localStatusFilter !== 'all' || priorityOnly || dateRange !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setLocalStatusFilter('all');
    setPriorityOnly(false);
    setDateRange('all');
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    if (currentPage <= 3) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Active Applications
            {!isLoading && applications && (
              <Badge variant="outline" className="ml-2">
                {totalItems > 0 ? `${startIndex + 1}-${Math.min(endIndex, totalItems)}` : '0'} of {totalItems}
              </Badge>
            )}
          </CardTitle>
        </div>

        {/* Filter Bar */}
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="tenant">Tenant Name</SelectItem>
                <SelectItem value="property">Property Address</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Checkbox & Active Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="priority"
                checked={priorityOnly}
                onCheckedChange={(checked) => setPriorityOnly(checked as boolean)}
              />
              <label
                htmlFor="priority"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🚀 Priority Only
              </label>
            </div>

            {hasActiveFilters && (
              <>
                <div className="h-4 w-px bg-border mx-2" />
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchTerm}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                {localStatusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {getStatusLabel(localStatusFilter)}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setLocalStatusFilter('all')} />
                  </Badge>
                )}
                {priorityOnly && (
                  <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                    🚀 Priority
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setPriorityOnly(false)} />
                  </Badge>
                )}
                {dateRange !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setDateRange('all')} />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 text-xs"
                >
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Pagination Controls - Top */}
        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : totalItems > 0 ? (
          <>
            <ApplicationsTable
              applications={paginatedApplications}
              onApplicationSelect={(app) => console.log('Selected:', app)}
              formatDate={formatDate}
              getStatusBadge={getStatusBadgeWrapper}
            />
            {/* Pagination Controls - Bottom */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : transformedApplications.length > 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No applications match your filters</p>
            <p className="text-sm mt-2">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="mt-4"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No active applications found</p>
            <p className="text-sm mt-2">
              Applications will appear here once tenants apply
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
