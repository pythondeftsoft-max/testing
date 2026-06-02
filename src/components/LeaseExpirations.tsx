
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CardEnhanced, CardEnhancedContent, CardEnhancedDescription, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Home, Settings, Clock, CheckCircle, XCircle, AlertTriangle, User, Loader2, Search, X } from 'lucide-react';
import { LeaseRenewalOverview } from './LeaseRenewalOverview';
import LandlordLeaseRenewalTable from './LandlordLeaseRenewalTable';
import { LeaseFinancialMetrics } from './lease/LeaseFinancialMetrics';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface LeaseExpirationsProps {
  userId: string;
  portfolioId?: string;
  defaultTab?: 'overview' | 'expirations' | 'renewals';
}

const LeaseExpirations = ({ userId, portfolioId, defaultTab = 'overview' }: LeaseExpirationsProps) => {
  const [units, setUnits] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [daysLeftFilter, setDaysLeftFilter] = useState('all');
  const [rentFilter, setRentFilter] = useState('all');

  const fetchUnitsWithLeases = useCallback(async () => {
    setLoading(true);
    try {
      let unitsQuery = supabase
        .from('property_units')
        .select(`
          id,
          unit_number,
          unit_name,
          status,
          monthly_rent,
          lease_start_date,
          lease_end_date,
          bedrooms,
          bathrooms,
          tenant_id,
          profiles!property_units_tenant_id_fkey (
            first_name,
            last_name
          ),
          properties!inner(
            id,
            address,
            city,
            state,
            zipcode,
            owner_id,
            portfolio_id,
            rent_splits(id)
          )
        `)
        .eq('properties.owner_id', userId)
        .eq('status', 'occupied')
        .order('lease_end_date', { ascending: true, nullsFirst: false });

      // Apply portfolio filter if not "everything"
      if (portfolioId && portfolioId !== 'everything') {
        unitsQuery = unitsQuery.eq('properties.portfolio_id', portfolioId);
      }

      // Fetch renewals
      let renewalsQuery = supabase
        .from('lease_renewals')
        .select(`
          *,
          properties!inner(owner_id, portfolio_id)
        `)
        .eq('properties.owner_id', userId);

      if (portfolioId && portfolioId !== 'everything') {
        renewalsQuery = renewalsQuery.eq('properties.portfolio_id', portfolioId);
      }

      // Fetch current tenants from marketplace_applications
      const { data: currentTenants } = await supabase
        .from('marketplace_applications')
        .select(`
          unit_id,
          user_id,
          profiles!marketplace_applications_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('lifecycle_stage', 'current_tenant')
        .eq('status', 'housed');

      // Create lookup map for marketplace tenants
      const marketplaceTenantMap = new Map();
      if (currentTenants) {
        currentTenants.forEach((app: any) => {
          if (app.unit_id && app.profiles) {
            marketplaceTenantMap.set(app.unit_id, app.profiles);
          }
        });
      }

      const [unitsResult, renewalsResult] = await Promise.all([
        unitsQuery,
        renewalsQuery
      ]);

      if (unitsResult.error) throw unitsResult.error;
      if (renewalsResult.error) throw renewalsResult.error;

      // Merge tenant data from both sources
      const unitsWithTenants = (unitsResult.data || []).map((unit: any) => {
        // If no tenant from property_units, check marketplace_applications
        if (!unit.profiles && marketplaceTenantMap.has(unit.id)) {
          return {
            ...unit,
            profiles: marketplaceTenantMap.get(unit.id)
          };
        }
        return unit;
      });

      setUnits(unitsWithTenants);
      setRenewals(renewalsResult.data || []);
    } catch (error) {
      console.error('Error fetching lease expirations:', error);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [userId, portfolioId]);

  useEffect(() => {
    fetchUnitsWithLeases();
  }, [fetchUnitsWithLeases]);

  const getUnitIdentifier = (unit: any) => {
    const address = unit.properties?.address || 'Unknown Address';
    const unitName = unit.unit_name || `Unit ${unit.unit_number}`;
    return `${address} – ${unitName}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (date.getFullYear() <= 1970) return 'Not set';
    return date.toLocaleDateString();
  };

  const getDaysUntilExpiration = (dateString: string) => {
    const today = new Date();
    const expirationDate = new Date(dateString);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadge = (dateString: string | null | undefined, days: number) => {
    // Check for null/invalid dates first - these need setup
    if (!dateString || new Date(dateString).getFullYear() <= 1970) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
          <Settings className="h-3 w-3" />
          Needs Setup
        </Badge>
      );
    }
    
    // Only show "Expired" for actual past dates
    if (days < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    } else if (days <= 30) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {days} days left
        </Badge>
      );
    } else if (days <= 60) {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          {days} days left
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          {days} days left
        </Badge>
      );
    }
  };


  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
  };

  const handleNavigateToFiltered = (filter: string) => {
    setActiveFilter(filter);
    setActiveTab('renewals');
  };

  // Belt-and-suspenders: client-side filter as fallback
  const displayedUnits = units.filter(unit =>
    portfolioId === 'everything' || unit.properties?.portfolio_id === portfolioId
  );

  // Filter units based on search and filters
  const filteredUnits = useMemo(() => {
    return displayedUnits.filter(unit => {
      // Search filter - match address, unit name, or tenant name
      const searchLower = searchQuery.toLowerCase();
      const address = unit.properties?.address?.toLowerCase() || '';
      const unitName = (unit.unit_name || `Unit ${unit.unit_number}`).toLowerCase();
      const tenantName = unit.profiles 
        ? `${unit.profiles.first_name} ${unit.profiles.last_name}`.toLowerCase() 
        : '';
      
      const matchesSearch = !searchQuery || 
        address.includes(searchLower) || 
        unitName.includes(searchLower) ||
        tenantName.includes(searchLower);

      // Days left filter
      const daysLeft = unit.lease_end_date ? getDaysUntilExpiration(unit.lease_end_date) : null;
      let matchesDaysFilter = true;
      if (daysLeftFilter === 'critical') matchesDaysFilter = daysLeft !== null && daysLeft <= 30;
      else if (daysLeftFilter === 'warning') matchesDaysFilter = daysLeft !== null && daysLeft > 30 && daysLeft <= 60;
      else if (daysLeftFilter === 'healthy') matchesDaysFilter = daysLeft !== null && daysLeft > 60;
      else if (daysLeftFilter === 'no-end') matchesDaysFilter = daysLeft === null;

      // Rent filter
      const rent = unit.monthly_rent || 0;
      let matchesRentFilter = true;
      if (rentFilter === 'under1000') matchesRentFilter = rent < 1000;
      else if (rentFilter === '1000-2000') matchesRentFilter = rent >= 1000 && rent < 2000;
      else if (rentFilter === '2000-3000') matchesRentFilter = rent >= 2000 && rent < 3000;
      else if (rentFilter === 'over3000') matchesRentFilter = rent >= 3000;

      return matchesSearch && matchesDaysFilter && matchesRentFilter;
    });
  }, [displayedUnits, searchQuery, daysLeftFilter, rentFilter]);

  // Pagination calculations
  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUnits = filteredUnits.slice(startIndex, endIndex);

  // Reset to page 1 when itemsPerPage, portfolioId, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, portfolioId, searchQuery, daysLeftFilter, rentFilter]);

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

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="animate-fade-in-up">
        <CardEnhancedContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading lease management...
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <>
      <CardEnhanced variant="elevated" animate={true}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2" gradient={true}>
            <Calendar className="h-5 w-5 text-openkey-blue" />
            Lease Management
          </CardEnhancedTitle>
          <CardEnhancedDescription>
            Manage lease expirations and renewals in one place
          </CardEnhancedDescription>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="command-tabs flex w-max md:w-full md:grid md:grid-cols-3">
                <TabsTrigger value="overview" className="command-tab-trigger">Overview</TabsTrigger>
                <TabsTrigger value="expirations" className="command-tab-trigger">All Leases</TabsTrigger>
                <TabsTrigger value="renewals" className="command-tab-trigger">Lease Renewals</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <LeaseFinancialMetrics units={displayedUnits} renewals={renewals} />
              
              {displayedUnits.length === 0 ? (
                <CardEnhanced variant="subtle" className="text-center py-8">
                  <CardEnhancedContent>
                    <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No occupied units with lease information found.</p>
                  </CardEnhancedContent>
                </CardEnhanced>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Upcoming Expirations</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('expirations')}
                      className="text-openkey-blue hover:text-openkey-blue/80"
                    >
                      View All →
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Unit</TableHead>
                          <TableHead className="font-semibold">Monthly Rent</TableHead>
                          <TableHead className="font-semibold">Lease End Date</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {displayedUnits.slice(0, 5).map((unit: any) => {
                        const daysUntilExpiration = getDaysUntilExpiration(unit.lease_end_date);
                        return (
                          <TableRow key={unit.id} className="table-row-hover">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-openkey-blue" />
                                  <div>
                                    <div className="font-medium text-foreground">{getUnitIdentifier(unit)}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {unit.bedrooms} bed / {unit.bathrooms} bath
                                      {unit.profiles && (
                                        <span className="ml-2 text-openkey-blue">
                                          • <User className="h-3 w-3 inline mr-1" />
                                          {unit.profiles.first_name} {unit.profiles.last_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-openkey-gold" />
                                <span className="font-medium">${unit.monthly_rent?.toLocaleString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(unit.lease_end_date)}</TableCell>
                            <TableCell>{getExpirationBadge(unit.lease_end_date, daysUntilExpiration)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                  {displayedUnits.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing top 5 upcoming expirations. View all in the All Leases tab.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expirations" className="space-y-6">
              {displayedUnits.length === 0 ? (
                <CardEnhanced variant="subtle" className="text-center py-8">
                  <CardEnhancedContent>
                    <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No occupied units with lease information found.</p>
                  </CardEnhancedContent>
                </CardEnhanced>
              ) : (
                <div className="space-y-4">
                  {/* Search and Filter Row */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search address, unit, or tenant..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Days Left Filter */}
                    <Select value={daysLeftFilter} onValueChange={setDaysLeftFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Days Left" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="critical">Critical (&lt;30 days)</SelectItem>
                        <SelectItem value="warning">Warning (30-60 days)</SelectItem>
                        <SelectItem value="healthy">Healthy (&gt;60 days)</SelectItem>
                        <SelectItem value="no-end">No End Date</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Rent Filter */}
                    <Select value={rentFilter} onValueChange={setRentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Rent Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rent</SelectItem>
                        <SelectItem value="under1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-2000">$1,000 - $2,000</SelectItem>
                        <SelectItem value="2000-3000">$2,000 - $3,000</SelectItem>
                        <SelectItem value="over3000">Over $3,000</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters Button */}
                    {(searchQuery || daysLeftFilter !== 'all' || rentFilter !== 'all') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setDaysLeftFilter('all');
                          setRentFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  {/* Pagination Controls - Top */}
                  <div className="flex items-center justify-between">
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
                      <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} units
                      </span>
                    </div>
                    
                    {totalPages > 1 && (
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
                    )}
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Unit</TableHead>
                          <TableHead className="font-semibold">Monthly Rent</TableHead>
                          <TableHead className="font-semibold">Lease Start Date</TableHead>
                          <TableHead className="font-semibold">Lease End Date</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUnits.map((unit: any) => {
                          const daysUntilExpiration = getDaysUntilExpiration(unit.lease_end_date);
                          return (
                            <TableRow key={unit.id} className="table-row-hover">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-openkey-blue" />
                                  <div>
                                    <div className="font-medium text-foreground">{getUnitIdentifier(unit)}</div>
              <div className="text-sm text-muted-foreground">
                {unit.bedrooms} bed / {unit.bathrooms} bath
                {unit.profiles && (
                  <span className="ml-2 text-openkey-blue">
                    • <User className="h-3 w-3 inline mr-1" />
                    {unit.profiles.first_name} {unit.profiles.last_name}
                  </span>
                )}
              </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-openkey-gold" />
                                  <span className="font-medium">${unit.monthly_rent?.toLocaleString()}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {unit.lease_start_date ? formatDate(unit.lease_start_date) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {unit.lease_end_date ? formatDate(unit.lease_end_date) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {getExpirationBadge(unit.lease_end_date, unit.lease_end_date ? daysUntilExpiration : 0)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls - Bottom */}
                  {totalPages > 1 && (
                    <div className="flex justify-center pt-2">
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="renewals" className="space-y-6">
              <LandlordLeaseRenewalTable
                landlordId={userId}
                portfolioId={portfolioId}
                activeFilter={activeFilter}
              />
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </>
  );
};

export default LeaseExpirations;
