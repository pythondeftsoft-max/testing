import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useEnhancedUnassignedQueue } from '@/hooks/useEnhancedUnassignedQueue';
import { useUnassignedPropertyUnits } from '@/hooks/useUnassignedPropertyUnits';
import { useWorkerAssignment } from '@/hooks/useWorkerAssignment';
import { usePropertyAssignment } from '@/hooks/usePropertyAssignment';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Clock, DollarSign, MapPin, Bed, User, CreditCard, Eye, Building2, Bath, Calendar, FileText, Maximize2, UserPlus, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import TenantProfileModal from '@/components/TenantProfileModal';
import PropertyDetailsModal from '@/components/PropertyDetailsModal';
import { AssignToWorkerDialog } from './AssignToWorkerDialog';
import { AutoAssignButton } from './AutoAssignButton';

export const UnassignedEntitiesQueue = () => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'properties'>('tenants');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignEntityType, setAssignEntityType] = useState<'tenant' | 'property' | null>(null);
  const [assignEntityId, setAssignEntityId] = useState<string | null>(null);
  const [assignEntityName, setAssignEntityName] = useState<string | null>(null);
  
  // Pagination states for Tenants
  const [tenantsCurrentPage, setTenantsCurrentPage] = useState(1);
  const [tenantsItemsPerPage, setTenantsItemsPerPage] = useState(25);
  
  // Pagination states for Properties
  const [propertiesCurrentPage, setPropertiesCurrentPage] = useState(1);
  const [propertiesItemsPerPage, setPropertiesItemsPerPage] = useState(25);

  // Filter states for Tenants
  const [tenantStateFilter, setTenantStateFilter] = useState<string>('all');
  const [tenantCityFilter, setTenantCityFilter] = useState<string>('all');
  const [tenantBedroomFilter, setTenantBedroomFilter] = useState<string>('all');
  const [tenantDaysSort, setTenantDaysSort] = useState<string>('default');

  // Filter states for Properties
  const [propertyStateFilter, setPropertyStateFilter] = useState<string>('all');
  const [propertyCityFilter, setPropertyCityFilter] = useState<string>('all');
  const [propertyBedroomFilter, setPropertyBedroomFilter] = useState<string>('all');
  const [propertyDaysSort, setPropertyDaysSort] = useState<string>('default');

  // Search states (debounced)
  const [tenantSearchInput, setTenantSearchInput] = useState('');
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [propertySearchInput, setPropertySearchInput] = useState('');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setTenantSearchQuery(tenantSearchInput.trim().toLowerCase()); setTenantsCurrentPage(1); }, 200);
    return () => clearTimeout(t);
  }, [tenantSearchInput]);
  useEffect(() => {
    const t = setTimeout(() => { setPropertySearchQuery(propertySearchInput.trim().toLowerCase()); setPropertiesCurrentPage(1); }, 200);
    return () => clearTimeout(t);
  }, [propertySearchInput]);
  
  const { user } = useAuth();
  
  // Use enhanced hook for tenant data
  const { data: enhancedTenants = [], isLoading: tenantsLoading } = useEnhancedUnassignedQueue('tenant');
  
  // Use property units hook for property data
  const { data: propertyUnits = [], isLoading: propertiesLoading } = useUnassignedPropertyUnits();
  
  const { assignTenantToWorker } = useWorkerAssignment();
  const { assignPropertyUnitToWorker } = usePropertyAssignment();

  // Extract unique filter values for tenants
  const tenantFilterOptions = useMemo(() => {
    const states = new Set<string>();
    const cities = new Set<string>();
    const bedrooms = new Set<string>();
    
    enhancedTenants.forEach((tenant: any) => {
      if (tenant.state) states.add(tenant.state);
      if (tenant.city) cities.add(tenant.city);
      if (tenant.bedrooms_approved && Array.isArray(tenant.bedrooms_approved)) {
        tenant.bedrooms_approved.forEach((br: any) => {
          const brStr = typeof br === 'string' ? br : `${br}BR`;
          bedrooms.add(brStr);
        });
      }
    });
    
    return {
      states: Array.from(states).sort(),
      cities: Array.from(cities).sort(),
      bedrooms: Array.from(bedrooms).sort((a, b) => {
        const numA = parseInt(a.replace('BR', ''));
        const numB = parseInt(b.replace('BR', ''));
        return numA - numB;
      }),
    };
  }, [enhancedTenants]);

  // Extract unique filter values for properties
  const propertyFilterOptions = useMemo(() => {
    const states = new Set<string>();
    const cities = new Set<string>();
    const bedrooms = new Set<string>();
    
    propertyUnits.forEach((unit: any) => {
      if (unit.state) states.add(unit.state);
      if (unit.city) cities.add(unit.city);
      if (unit.bedrooms) bedrooms.add(`${unit.bedrooms}BR`);
    });
    
    return {
      states: Array.from(states).sort(),
      cities: Array.from(cities).sort(),
      bedrooms: Array.from(bedrooms).sort((a, b) => {
        const numA = parseInt(a.replace('BR', ''));
        const numB = parseInt(b.replace('BR', ''));
        return numA - numB;
      }),
    };
  }, [propertyUnits]);

  // Filter and sort tenants
  const filteredTenants = useMemo(() => {
    let result = enhancedTenants.filter((tenant: any) => {
      if (tenantStateFilter !== 'all' && tenant.state !== tenantStateFilter) return false;
      if (tenantCityFilter !== 'all' && tenant.city !== tenantCityFilter) return false;
      if (tenantBedroomFilter !== 'all') {
        const bedroomsApproved = tenant.bedrooms_approved || [];
        const bedroomMatch = bedroomsApproved.some((br: any) => {
          const brStr = typeof br === 'string' ? br : `${br}BR`;
          return brStr === tenantBedroomFilter;
        });
        if (!bedroomMatch) return false;
      }
      if (tenantSearchQuery) {
        const aw = tenant.assigned_worker || {};
        const hay = [
          tenant.first_name, tenant.last_name, tenant.full_name, tenant.email, tenant.phone,
          tenant.city, tenant.state, tenant.voucher_pha_name, tenant.pha_name,
          aw.first_name, aw.last_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(tenantSearchQuery)) return false;
      }
      return true;
    });

    // Apply days seeking sort
    if (tenantDaysSort === 'oldest') {
      result = [...result].sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (tenantDaysSort === 'newest') {
      result = [...result].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [enhancedTenants, tenantStateFilter, tenantCityFilter, tenantBedroomFilter, tenantDaysSort, tenantSearchQuery]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = propertyUnits.filter((unit: any) => {
      if (propertyStateFilter !== 'all' && unit.state !== propertyStateFilter) return false;
      if (propertyCityFilter !== 'all' && unit.city !== propertyCityFilter) return false;
      if (propertyBedroomFilter !== 'all') {
        const unitBedrooms = `${unit.bedrooms}BR`;
        if (unitBedrooms !== propertyBedroomFilter) return false;
      }
      if (propertySearchQuery) {
        const aw = unit.assigned_worker || {};
        const owner = unit.profiles || unit.owner || {};
        const hay = [
          unit.street_address, unit.address, unit.unit_number,
          unit.city, unit.state, unit.zip, unit.zip_code,
          owner.first_name, owner.last_name, owner.email,
          aw.first_name, aw.last_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(propertySearchQuery)) return false;
      }
      return true;
    });

    // Apply days listed sort
    if (propertyDaysSort === 'oldest') {
      result = [...result].sort((a: any, b: any) => {
        const dateA = new Date(a.listed_date || a.updated_at).getTime();
        const dateB = new Date(b.listed_date || b.updated_at).getTime();
        return dateA - dateB;
      });
    } else if (propertyDaysSort === 'newest') {
      result = [...result].sort((a: any, b: any) => {
        const dateA = new Date(a.listed_date || a.updated_at).getTime();
        const dateB = new Date(b.listed_date || b.updated_at).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [propertyUnits, propertyStateFilter, propertyCityFilter, propertyBedroomFilter, propertyDaysSort, propertySearchQuery]);

  const hasTenantFilters = tenantStateFilter !== 'all' || tenantCityFilter !== 'all' || tenantBedroomFilter !== 'all' || tenantDaysSort !== 'default' || tenantSearchQuery !== '';
  const hasPropertyFilters = propertyStateFilter !== 'all' || propertyCityFilter !== 'all' || propertyBedroomFilter !== 'all' || propertyDaysSort !== 'default' || propertySearchQuery !== '';

  const clearTenantFilters = () => {
    setTenantStateFilter('all');
    setTenantCityFilter('all');
    setTenantBedroomFilter('all');
    setTenantDaysSort('default');
    setTenantSearchInput('');
    setTenantSearchQuery('');
    setTenantsCurrentPage(1);
  };

  const clearPropertyFilters = () => {
    setPropertyStateFilter('all');
    setPropertyCityFilter('all');
    setPropertyBedroomFilter('all');
    setPropertyDaysSort('default');
    setPropertySearchInput('');
    setPropertySearchQuery('');
    setPropertiesCurrentPage(1);
  };

  // Tenants pagination (using filtered data)
  const tenantsTotalItems = filteredTenants.length;
  const tenantsTotalPages = Math.ceil(tenantsTotalItems / tenantsItemsPerPage);
  const tenantsStartIndex = (tenantsCurrentPage - 1) * tenantsItemsPerPage;
  const tenantsEndIndex = tenantsStartIndex + tenantsItemsPerPage;
  const paginatedTenants = filteredTenants.slice(tenantsStartIndex, tenantsEndIndex);

  // Properties pagination (using filtered data)
  const propertiesTotalItems = filteredProperties.length;
  const propertiesTotalPages = Math.ceil(propertiesTotalItems / propertiesItemsPerPage);
  const propertiesStartIndex = (propertiesCurrentPage - 1) * propertiesItemsPerPage;
  const propertiesEndIndex = propertiesStartIndex + propertiesItemsPerPage;
  const paginatedPropertyUnits = filteredProperties.slice(propertiesStartIndex, propertiesEndIndex);

  const isLoading = activeTab === 'tenants' ? tenantsLoading : propertiesLoading;

  // Copy tenant info function
  const handleCopyTenantInfo = (tenant: any) => {
    const tenantName = tenant.full_name || 'N/A';
    const location = tenant.city && tenant.state 
      ? `${tenant.city}, ${tenant.state}` 
      : tenant.city || tenant.state || 'N/A';
    
    const bedroomsText = tenant.bedrooms_approved?.length
      ? tenant.bedrooms_approved.map((b: number) => `${b}BR`).join(', ')
      : 'N/A';
    
    const rentRange = tenant.rent_range_min != null && tenant.rent_range_max != null
      ? `$${tenant.rent_range_min.toLocaleString()} - $${tenant.rent_range_max.toLocaleString()}`
      : tenant.rent_range_max != null
        ? `Up to $${tenant.rent_range_max.toLocaleString()}`
        : tenant.rent_range_min != null
          ? `From $${tenant.rent_range_min.toLocaleString()}`
          : tenant.max_rent 
            ? `Up to $${tenant.max_rent.toLocaleString()}`
            : 'N/A';
    
    const voucherText = (tenant.voucher_status === 'yes' || tenant.voucher_holder)
      ? `Yes${tenant.voucher_amount ? ` ($${tenant.voucher_amount.toLocaleString()})` : ''}`
      : tenant.voucher_status === 'in-progress' ? 'In Progress'
      : 'No';

    // Financial info
    const incomeText = tenant.monthly_income 
      ? `$${tenant.monthly_income.toLocaleString()}` 
      : 'N/A';
    const employmentText = tenant.employment_status || 'N/A';
    const creditText = tenant.credit_score_range || 'N/A';

    // Background info
    const evictionText = tenant.has_eviction 
      ? `Yes${tenant.eviction_details ? ` - ${tenant.eviction_details}` : ''}`
      : 'No';
    const felonyText = tenant.has_felonies 
      ? `Yes${tenant.felony_details ? ` - ${tenant.felony_details}` : ''}`
      : 'No';

    const text = `TENANT INFORMATION
==================
Name: ${tenantName}
Email: ${tenant.email || 'N/A'}
Phone: ${tenant.phone || 'N/A'}
Location: ${location}

HOUSING REQUIREMENTS
==================
Bedrooms Approved: ${bedroomsText}
Rent Range: ${rentRange}
Voucher: ${voucherText}
Move-in Timeline: ${tenant.move_in_window || 'N/A'}
Pets: ${tenant.has_pets ? `Yes${tenant.pet_type ? ` (${tenant.pet_type})` : ''}` : 'No'}

FINANCIAL INFORMATION
==================
Monthly Income: ${incomeText}
Employment Status: ${employmentText}
Credit Score Range: ${creditText}

BACKGROUND
==================
Eviction History: ${evictionText}
Felony History: ${felonyText}

[Generated from OpenKey]`;

    navigator.clipboard.writeText(text);
    toast.success(`${tenantName}'s info copied to clipboard`);
  };
  
  // Page numbers helper
  const getPageNumbers = (currentPage: number, totalPages: number): (number | string)[] => {
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
  
  // Calculate days on market
  const calculateDaysOnMarket = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Entity Queue</CardTitle>
            <Badge variant="secondary">
              {activeTab === 'tenants' 
                ? tenantsTotalItems > 0 
                  ? `${tenantsStartIndex + 1}-${Math.min(tenantsEndIndex, tenantsTotalItems)} of ${tenantsTotalItems} Tenants`
                  : '0 Tenants'
                : propertiesTotalItems > 0
                  ? `${propertiesStartIndex + 1}-${Math.min(propertiesEndIndex, propertiesTotalItems)} of ${propertiesTotalItems} Properties`
                  : '0 Properties'
              }
            </Badge>
          </div>
          <AutoAssignButton />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tenants' | 'properties')}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="tenants" className="flex-1">Tenants</TabsTrigger>
            <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <div className="space-y-4">
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={tenantSearchInput}
                    onChange={(e) => setTenantSearchInput(e.target.value)}
                    placeholder="Search name, email, PHA…"
                    className="h-9 pl-7 w-[240px]"
                  />
                </div>
                <Select value={tenantStateFilter} onValueChange={(v) => { setTenantStateFilter(v); setTenantsCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {tenantFilterOptions.states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tenantCityFilter} onValueChange={(v) => { setTenantCityFilter(v); setTenantsCurrentPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {tenantFilterOptions.cities
                      .filter(city => tenantStateFilter === 'all' || enhancedTenants.some((t: any) => t.city === city && t.state === tenantStateFilter))
                      .map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={tenantBedroomFilter} onValueChange={(v) => { setTenantBedroomFilter(v); setTenantsCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bedrooms</SelectItem>
                    {tenantFilterOptions.bedrooms.map(br => (
                      <SelectItem key={br} value={br}>{br}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tenantDaysSort} onValueChange={(v) => { setTenantDaysSort(v); setTenantsCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Days Seeking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Days Seeking</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
                {hasTenantFilters && (
                  <Button variant="ghost" size="sm" onClick={clearTenantFilters} className="h-9">
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* Pagination Controls - Top */}
              {tenantsTotalItems > 0 && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-4">
                    <Select 
                      value={tenantsItemsPerPage.toString()} 
                      onValueChange={(value) => {
                        setTenantsItemsPerPage(Number(value));
                        setTenantsCurrentPage(1);
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
                      {tenantsStartIndex + 1}-{Math.min(tenantsEndIndex, tenantsTotalItems)} of {tenantsTotalItems} tenants
                    </span>
                  </div>
                  
                  {tenantsTotalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setTenantsCurrentPage(Math.max(1, tenantsCurrentPage - 1))}
                            className={tenantsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers(tenantsCurrentPage, tenantsTotalPages).map((pageNum, idx) => (
                          <PaginationItem key={idx}>
                            {pageNum === '...' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => setTenantsCurrentPage(pageNum as number)}
                                isActive={tenantsCurrentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setTenantsCurrentPage(Math.min(tenantsTotalPages, tenantsCurrentPage + 1))}
                            className={tenantsCurrentPage === tenantsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}

              {/* Tenants List */}
              {paginatedTenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No unassigned tenants in queue
                </div>
              ) : (
                (paginatedTenants as any[]).map((tenant) => {
              // Parse bedrooms_approved to display format
              const formatBedrooms = (bedrooms: any[]): string => {
                if (!bedrooms || bedrooms.length === 0) return 'N/A';
                
                // Handle array of strings like ['1BR', '2BR'] or numbers like [1, 2]
                const parsed = bedrooms
                  .map(br => {
                    if (typeof br === 'string') {
                      return br.replace('BR', '');
                    }
                    return br;
                  })
                  .sort();
                
                if (parsed.length === 1) return `${parsed[0]} BR`;
                return `${parsed[0]}-${parsed[parsed.length - 1]} BR`;
              };

              // Format rent range
              const formatRentRange = (min?: number, max?: number): string => {
                if (!min && !max) return 'N/A';
                if (min && max && min === max) return `$${min.toLocaleString()}`;
                if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
                if (min) return `$${min.toLocaleString()}+`;
                if (max) return `Up to $${max.toLocaleString()}`;
                return 'N/A';
              };

                  return (
                    <div
                      key={tenant.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{tenant.full_name}</span>
                          {tenant.voucher_holder && (
                            <Badge variant="success" className="text-xs">Voucher</Badge>
                          )}
                          {tenant.assigned_worker_id && (
                            <Badge variant="outline" className="text-xs">Assigned</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {formatBedrooms(tenant.bedrooms_approved)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatRentRange(tenant.rent_range_min, tenant.rent_range_max)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {tenant.city && tenant.state 
                              ? `${tenant.city}, ${tenant.state}${tenant.zip_code !== 'N/A' ? ` ${tenant.zip_code}` : ''}`
                              : tenant.city && tenant.zip_code !== 'N/A'
                              ? `${tenant.city}, ${tenant.zip_code}`
                              : tenant.city || 'N/A'}
                            {tenant.country_code && tenant.country_code !== 'US' && (
                              <span className="text-xs text-muted-foreground ml-1">({tenant.country_code})</span>
                            )}
                          </span>
                          {tenant.credit_score && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {tenant.credit_score}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyTenantInfo(tenant)}
                          title="Copy Tenant Info"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenantId(tenant.user_id);
                            setIsTenantModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAssignEntityType('tenant');
                            setAssignEntityId(tenant.user_id);
                            setAssignEntityName(tenant.full_name);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign to...
                        </Button>
                        {!tenant.assigned_worker_id && (
                          <Button
                            size="sm"
                            onClick={() => assignTenantToWorker.mutate({ 
                              tenantId: tenant.user_id, 
                              workerId: user?.id || '' 
                            })}
                            disabled={assignTenantToWorker.isPending || !user}
                          >
                            Assign to Me
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Pagination Controls - Bottom */}
              {tenantsTotalItems > 0 && tenantsTotalPages > 1 && (
                <div className="flex justify-center pt-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setTenantsCurrentPage(Math.max(1, tenantsCurrentPage - 1))}
                          className={tenantsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers(tenantsCurrentPage, tenantsTotalPages).map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === '...' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setTenantsCurrentPage(pageNum as number)}
                              isActive={tenantsCurrentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setTenantsCurrentPage(Math.min(tenantsTotalPages, tenantsCurrentPage + 1))}
                          className={tenantsCurrentPage === tenantsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <div className="space-y-4">
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={propertySearchInput}
                    onChange={(e) => setPropertySearchInput(e.target.value)}
                    placeholder="Search address, owner, worker…"
                    className="h-9 pl-7 w-[240px]"
                  />
                </div>
                <Select value={propertyStateFilter} onValueChange={(v) => { setPropertyStateFilter(v); setPropertiesCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {propertyFilterOptions.states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={propertyCityFilter} onValueChange={(v) => { setPropertyCityFilter(v); setPropertiesCurrentPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {propertyFilterOptions.cities
                      .filter(city => propertyStateFilter === 'all' || propertyUnits.some((u: any) => u.city === city && u.state === propertyStateFilter))
                      .map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={propertyBedroomFilter} onValueChange={(v) => { setPropertyBedroomFilter(v); setPropertiesCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bedrooms</SelectItem>
                    {propertyFilterOptions.bedrooms.map(br => (
                      <SelectItem key={br} value={br}>{br}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={propertyDaysSort} onValueChange={(v) => { setPropertyDaysSort(v); setPropertiesCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Days Listed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Days Listed</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
                {hasPropertyFilters && (
                  <Button variant="ghost" size="sm" onClick={clearPropertyFilters} className="h-9">
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>
              {/* Pagination Controls - Top */}
              {propertiesTotalItems > 0 && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-4">
                    <Select 
                      value={propertiesItemsPerPage.toString()} 
                      onValueChange={(value) => {
                        setPropertiesItemsPerPage(Number(value));
                        setPropertiesCurrentPage(1);
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
                      {propertiesStartIndex + 1}-{Math.min(propertiesEndIndex, propertiesTotalItems)} of {propertiesTotalItems} properties
                    </span>
                  </div>
                  
                  {propertiesTotalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setPropertiesCurrentPage(Math.max(1, propertiesCurrentPage - 1))}
                            className={propertiesCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers(propertiesCurrentPage, propertiesTotalPages).map((pageNum, idx) => (
                          <PaginationItem key={idx}>
                            {pageNum === '...' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => setPropertiesCurrentPage(pageNum as number)}
                                isActive={propertiesCurrentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setPropertiesCurrentPage(Math.min(propertiesTotalPages, propertiesCurrentPage + 1))}
                            className={propertiesCurrentPage === propertiesTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}

              {/* Properties List */}
              {paginatedPropertyUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No unassigned properties in queue
                </div>
              ) : (
                paginatedPropertyUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{unit.address}</span>
                        {unit.unit_name && (
                          <Badge variant="outline" className="text-xs">{unit.unit_name}</Badge>
                        )}
                        {!unit.unit_name && unit.unit_number !== '1' && (
                          <Badge variant="outline" className="text-xs">Unit {unit.unit_number}</Badge>
                        )}
                        {unit.assigned_worker_id && (
                          <Badge variant="outline" className="text-xs">Assigned</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {unit.bedrooms} BR
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {unit.bathrooms} BA
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {unit.monthly_rent 
                            ? `$${unit.monthly_rent.toLocaleString()}/mo` 
                            : unit.property_monthly_rent 
                              ? `$${unit.property_monthly_rent.toLocaleString()}/mo` 
                              : 'TBD'
                          }
                        </span>
                        {unit.square_feet && (
                          <span className="flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            {unit.square_feet.toLocaleString()} sq ft
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {calculateDaysOnMarket(unit.updated_at)} days on market
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {unit.application_count || 0} applications
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {unit.city}, {unit.state} {unit.zipcode}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProperty(unit)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAssignEntityType('property');
                          setAssignEntityId(unit.id);
                          setAssignEntityName(`${unit.address}${unit.unit_name ? ` - ${unit.unit_name}` : ''}`);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign to...
                      </Button>
                      {!unit.assigned_worker_id && (
                        <Button
                          size="sm"
                          onClick={() => assignPropertyUnitToWorker.mutate({ 
                            unitId: unit.id, 
                            workerId: user?.id || '' 
                          })}
                          disabled={assignPropertyUnitToWorker.isPending || !user}
                        >
                          Assign to Me
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Pagination Controls - Bottom */}
              {propertiesTotalItems > 0 && propertiesTotalPages > 1 && (
                <div className="flex justify-center pt-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPropertiesCurrentPage(Math.max(1, propertiesCurrentPage - 1))}
                          className={propertiesCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers(propertiesCurrentPage, propertiesTotalPages).map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === '...' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setPropertiesCurrentPage(pageNum as number)}
                              isActive={propertiesCurrentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPropertiesCurrentPage(Math.min(propertiesTotalPages, propertiesCurrentPage + 1))}
                          className={propertiesCurrentPage === propertiesTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Tenant Profile Modal */}
      {selectedTenantId && (
        <TenantProfileModal
          isOpen={isTenantModalOpen}
          onClose={() => {
            setIsTenantModalOpen(false);
            setSelectedTenantId(null);
          }}
          tenantId={selectedTenantId}
          propertyId=""
        />
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetailsModal
          isOpen={!!selectedProperty}
          onClose={() => setSelectedProperty(null)}
          property={selectedProperty}
          isAdmin={true}
        />
      )}

      {/* Assign to Worker Dialog */}
      <AssignToWorkerDialog
        isOpen={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false);
          setAssignEntityType(null);
          setAssignEntityId(null);
          setAssignEntityName(null);
        }}
        onAssign={(workerId) => {
          if (assignEntityType === 'tenant' && assignEntityId) {
            assignTenantToWorker.mutate({ 
              tenantId: assignEntityId, 
              workerId 
            });
          } else if (assignEntityType === 'property' && assignEntityId) {
            assignPropertyUnitToWorker.mutate({ 
              unitId: assignEntityId, 
              workerId 
            });
          }
        }}
        entityType={assignEntityType || 'tenant'}
        entityName={assignEntityName || ''}
      />
    </Card>
  );
};
