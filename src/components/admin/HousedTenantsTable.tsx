
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Filter,
  X,
  User,
  Home,
  Eye,
  Phone,
  CreditCard
} from 'lucide-react';
import { EnhancedTenantProfileModal } from './EnhancedTenantProfileModal';
import { AdminHousedTenantCard } from './AdminHousedTenantCard';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface HousedTenant {
  id: string;
  user_id: string;
  property_id: string;
  property_address: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  monthly_rent: number;
  lease_start_date: string;
  lease_end_date: string;
  voucher_holder: boolean;
  voucher_amount: number;
  rent_due_day: number;
  city: string;
  zip_code: string;
  credit_score: number;
  employment_status: string;
  monthly_income: number;
  max_rent: number;
  preferred_locations: string[];
  message_credits: number;
  is_plus_subscriber: boolean;
  housing_authority?: string;
  move_in_window?: string;
  has_pets?: boolean;
  pet_type?: string;
  has_accessibility_needs?: boolean;
  accessibility_details?: string;
  has_eviction?: boolean;
  eviction_details?: string;
  has_felonies?: boolean;
  felony_details?: string;
  // Property/Landlord focused fields
  landlord_id: string;
  landlord_name: string;
  landlord_email: string;
  landlord_phone: string;
  placement_fee_amount: number;
  placement_fee_percentage: number;
  bedrooms?: number;
  bathrooms?: number;
  created_at: string;
  worker_assigned_at?: string | null;
  search_duration_days?: number;
  housing_status?: string;
}

const HousedTenantsTable = () => {
  const [housedTenants, setHousedTenants] = useState<HousedTenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<HousedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('');
  const [rentRangeFilter, setRentRangeFilter] = useState('');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<HousedTenant | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;

  useEffect(() => {
    fetchHousedTenants();
  }, []);

  // Filter tenants based on all criteria
  useEffect(() => {
    let filtered = housedTenants;

    // Search filter - now includes landlord name and email
    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.tenant_phone.includes(searchTerm) ||
        tenant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.landlord_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.landlord_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter(tenant => tenant.city === cityFilter);
    }

    // Voucher filter
    if (voucherFilter) {
      if (voucherFilter === 'yes') {
        filtered = filtered.filter(tenant => tenant.voucher_holder);
      } else if (voucherFilter === 'no') {
        filtered = filtered.filter(tenant => !tenant.voucher_holder);
      }
    }

    // Rent range filter
    if (rentRangeFilter) {
      if (rentRangeFilter === 'under1000') {
        filtered = filtered.filter(tenant => tenant.monthly_rent < 1000);
      } else if (rentRangeFilter === '1000to1500') {
        filtered = filtered.filter(tenant => tenant.monthly_rent >= 1000 && tenant.monthly_rent <= 1500);
      } else if (rentRangeFilter === '1500to2000') {
        filtered = filtered.filter(tenant => tenant.monthly_rent >= 1500 && tenant.monthly_rent <= 2000);
      } else if (rentRangeFilter === 'over2000') {
        filtered = filtered.filter(tenant => tenant.monthly_rent > 2000);
      }
    }

    // Lease status filter
    if (leaseStatusFilter) {
      const currentDate = new Date();
      if (leaseStatusFilter === 'expiring_soon') {
        filtered = filtered.filter(tenant => {
          if (!tenant.lease_end_date) return false;
          const leaseEnd = new Date(tenant.lease_end_date);
          const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
          return daysUntilExpiry <= 90 && daysUntilExpiry > 0; // Expiring in next 90 days
        });
      } else if (leaseStatusFilter === 'expired') {
        filtered = filtered.filter(tenant => {
          if (!tenant.lease_end_date) return false;
          const leaseEnd = new Date(tenant.lease_end_date);
          return leaseEnd < currentDate;
        });
      } else if (leaseStatusFilter === 'active') {
        filtered = filtered.filter(tenant => {
          if (!tenant.lease_end_date) return true;
          const leaseEnd = new Date(tenant.lease_end_date);
          return leaseEnd > currentDate;
        });
      }
    }

    setFilteredTenants(filtered);
  }, [housedTenants, searchTerm, cityFilter, voucherFilter, rentRangeFilter, leaseStatusFilter]);

  // Pagination calculations
  const totalItems = filteredTenants?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = filteredTenants?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, voucherFilter, rentRangeFilter, leaseStatusFilter]);

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

  const fetchHousedTenants = async () => {
    try {
      console.log('🏠 Starting to fetch housed tenants...');
      
      // Get all approved property applications
      const { data: applications, error: applicationsError } = await supabase
        .from('property_applications')
        .select(`
          id,
          property_id,
          tenant_id,
          status,
          created_at,
          properties!property_applications_property_id_fkey (
            id,
            address,
            monthly_rent,
            lease_start_date,
            lease_end_date,
            rent_due_day,
            city,
            zipcode,
            owner_id,
            bedrooms,
            bathrooms
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // ALSO get approved unit applications (new workflow)
      const { data: unitApplications, error: unitAppsError } = await supabase
        .from('unit_applications')
        .select(`
          id,
          unit_id,
          tenant_id,
          status,
          created_at,
          property_units!inner (
            id,
            property_id,
            unit_number,
            monthly_rent,
            properties (
              id,
              address,
              monthly_rent,
              lease_start_date,
              lease_end_date,
              rent_due_day,
              city,
              zipcode,
              owner_id,
              bedrooms,
              bathrooms
            )
          ),
          landlord_placement_fees!landlord_placement_fees_tenant_id_fkey (
            fee_amount,
            payment_status,
            payment_date
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      console.log('📋 Property applications:', { applications, applicationsError });
      console.log('📋 Unit applications:', { unitApplications, unitAppsError });

      // Transform unit applications to match property applications structure
      const transformedUnitApps = (unitApplications || []).map(ua => ({
        id: ua.id,
        property_id: ua.property_units?.properties?.id,
        tenant_id: ua.tenant_id,
        status: ua.status,
        created_at: ua.created_at,
        properties: ua.property_units?.properties,
        unit_number: ua.property_units?.unit_number,
        unit_monthly_rent: ua.property_units?.monthly_rent,
      }));

      // Combine both sources
      const allApplications = [
        ...(applications || []),
        ...transformedUnitApps
      ];

      console.log('📋 Combined applications:', allApplications.length);

      if (applicationsError) {
        console.error('❌ Error fetching property applications:', applicationsError);
      }
      
      if (unitAppsError) {
        console.error('❌ Error fetching unit applications:', unitAppsError);
      }

      if (!allApplications || allApplications.length === 0) {
        console.log('⚠️ No approved applications found');
        setHousedTenants([]);
        return;
      }

      // Dedupe by tenant_id, keeping the latest application per tenant
      const latestApplicationsByTenant = allApplications.reduce((acc, app) => {
        if (!acc[app.tenant_id] || new Date(app.created_at) > new Date(acc[app.tenant_id].created_at)) {
          acc[app.tenant_id] = app;
        }
        return acc;
      }, {} as Record<string, typeof applications[0]>);

      const uniqueApplications = Object.values(latestApplicationsByTenant);
      const tenantIds = uniqueApplications.map(app => app.tenant_id);
      console.log('👥 Unique tenant IDs for profiles:', tenantIds);
      
      // Fetch placement fees for these tenants
      const { data: placementFees, error: feesError } = await supabase
        .from('landlord_placement_fees')
        .select('tenant_id, fee_amount, payment_status, payment_date')
        .in('tenant_id', tenantIds);

      console.log('💰 Placement fees query result:', { placementFees, feesError });

      if (feesError) {
        console.error('❌ Error fetching placement fees:', feesError);
      }
      
      const { data: tenantProfiles, error: profilesError } = await supabase
        .from('tenant_profiles')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            phone,
            created_at,
            worker_assigned_at,
            housing_status
          )
        `)
        .in('user_id', tenantIds);

      console.log('👤 Tenant profiles query result:', { tenantProfiles, profilesError });

      if (profilesError) {
        console.error('❌ Error fetching tenant profiles:', profilesError);
      }

      // Also get profiles directly in case tenant_profiles is missing
      const { data: directProfiles, error: directProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, created_at, worker_assigned_at, housing_status')
        .in('id', tenantIds);

      console.log('👤 Direct profiles query result:', { directProfiles, directProfilesError });

      // Fetch landlord/owner profiles
      const ownerIds = [...new Set(uniqueApplications.map(app => app.properties?.owner_id).filter(Boolean))];
      console.log('🏢 Fetching landlord profiles for owner IDs:', ownerIds);
      
      const { data: landlordProfiles, error: landlordError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', ownerIds);

      console.log('🏢 Landlord profiles query result:', { landlordProfiles, landlordError });

      // Combine all the data
      console.log('🔄 Starting data transformation...');
      console.log('📋 Applications count:', allApplications.length);
      console.log('📋 Unique applications count:', uniqueApplications.length);
      console.log('👥 Tenant profiles count:', tenantProfiles?.length || 0);
      console.log('🏢 Landlord profiles count:', landlordProfiles?.length || 0);
      
      const transformedData = uniqueApplications.map(application => {
        const property = application.properties;
        if (!property) {
          console.log(`❌ Skipping application ${application.id} - no property found`);
          return null;
        }

        const tenantProfile = tenantProfiles?.find(tp => tp.user_id === application.tenant_id);
        const profile = tenantProfile?.profiles || directProfiles?.find(dp => dp.id === application.tenant_id);
        
        // Extract housing_status from multiple possible sources
        const profileHousingStatus = (profile as any)?.housing_status;
        const tenantProfileHousingStatus = (tenantProfile?.profiles as any)?.housing_status;
        const directProfileHousingStatus = directProfiles?.find(dp => dp.id === application.tenant_id)?.housing_status;
        const housingStatus = profileHousingStatus || tenantProfileHousingStatus || directProfileHousingStatus || 'seeking';

        console.log(`🏠 Processing application ${application.id}:`, {
          property: property.address,
          tenantProfile: tenantProfile ? 'found' : 'missing',
          profile: profile ? 'found' : 'missing',
          tenantId: application.tenant_id,
          housingStatus,
          profileHousingStatus,
          tenantProfileHousingStatus,
          directProfileHousingStatus
        });

        // Use fallback values if profile data is missing
        const firstName = profile?.first_name || 'Unknown';
        const lastName = profile?.last_name || 'Tenant';
        const fullName = `${firstName} ${lastName}`.trim();

        // Get landlord information
        const landlord = landlordProfiles?.find(lp => lp.id === property.owner_id);
        const landlordFirstName = landlord?.first_name || 'Unknown';
        const landlordLastName = landlord?.last_name || 'Owner';
        const landlordFullName = `${landlordFirstName} ${landlordLastName}`.trim();

        // Get placement fee from database or calculate if not available
        const placementFeeRecord = placementFees?.find(pf => pf.tenant_id === application.tenant_id);
        const unitRent = (application as any).unit_monthly_rent || property.monthly_rent || 0;
        const monthlyRent = unitRent;
        const placementFee = placementFeeRecord?.fee_amount || ((monthlyRent * placementFeePercentage) / 100);

        // Calculate search duration
        let searchDurationDays: number | undefined;
        const leaseStartDate = property.lease_start_date ? new Date(property.lease_start_date) : null;

        if (leaseStartDate) {
          const searchStartDate = profile?.worker_assigned_at 
            ? new Date(profile.worker_assigned_at) 
            : profile?.created_at 
            ? new Date(profile.created_at) 
            : null;
          
          if (searchStartDate) {
            const diffTime = leaseStartDate.getTime() - searchStartDate.getTime();
            searchDurationDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
        }

        // Format property address with unit number if available
        const unitNumber = (application as any).unit_number;
        const formattedAddress = unitNumber 
          ? `${property.address || 'N/A'} - Unit ${unitNumber}`
          : property.address || 'N/A';

        return {
          id: property.id,
          user_id: application.tenant_id,
          property_id: property.id,
          property_address: formattedAddress,
          tenant_name: fullName || `Tenant ${application.tenant_id.slice(0, 8)}`,
          tenant_email: `${firstName?.toLowerCase() || 'tenant'}@demo.com`,
          tenant_phone: profile?.phone || 'N/A',
          monthly_rent: monthlyRent,
          lease_start_date: property.lease_start_date || '',
          lease_end_date: property.lease_end_date || '',
          voucher_holder: tenantProfile?.voucher_holder || false,
          voucher_amount: tenantProfile?.voucher_amount || 0,
          rent_due_day: property.rent_due_day || 1,
          city: tenantProfile?.city || property.city || 'N/A',
          zip_code: tenantProfile?.zip_code || property.zipcode || 'N/A',
          credit_score: tenantProfile?.credit_score || 0,
          employment_status: tenantProfile?.employment_status || 'N/A',
          monthly_income: tenantProfile?.monthly_income || 0,
          max_rent: tenantProfile?.max_rent || 0,
          preferred_locations: tenantProfile?.preferred_locations || [],
          message_credits: tenantProfile?.message_credits || 0,
          is_plus_subscriber: tenantProfile?.is_plus_subscriber || false,
          housing_authority: tenantProfile?.housing_authority || undefined,
          move_in_window: tenantProfile?.move_in_window || undefined,
          has_pets: tenantProfile?.has_pets || false,
          pet_type: tenantProfile?.pet_type || undefined,
          has_accessibility_needs: tenantProfile?.has_accessibility_needs || false,
          accessibility_details: tenantProfile?.accessibility_details || undefined,
          has_eviction: tenantProfile?.has_eviction || false,
          eviction_details: tenantProfile?.eviction_details || undefined,
          has_felonies: tenantProfile?.has_felonies || false,
          felony_details: tenantProfile?.felony_details || undefined,
          // Property/Landlord focused fields
          landlord_id: property.owner_id || '',
          landlord_name: landlordFullName,
          landlord_email: landlord?.email || 'N/A',
          landlord_phone: landlord?.phone || 'N/A',
          placement_fee_amount: placementFee,
          placement_fee_percentage: placementFeePercentage,
          bedrooms: property.bedrooms || undefined,
          bathrooms: property.bathrooms || undefined,
          created_at: profile?.created_at || '',
          worker_assigned_at: profile?.worker_assigned_at || null,
          search_duration_days: searchDurationDays,
          housing_status: housingStatus,
        } as HousedTenant;
      }).filter((tenant): tenant is HousedTenant => {
        // Only show tenants who have actually moved in (housing_status = 'housed')
        const isHoused = tenant !== null && tenant.housing_status === 'housed';
        if (!isHoused && tenant !== null) {
          console.log(`❌ Filtering out ${tenant.tenant_name} - housing_status: ${tenant.housing_status}`);
        }
        return isHoused;
      });

      console.log('✅ Final housed tenants data:', transformedData);
      console.log(`📊 Successfully transformed ${transformedData.length} housed tenants`);

      setHousedTenants(transformedData);
    } catch (error) {
      console.error('Error fetching housed tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary metrics
  const totalPlacements = filteredTenants.length;
  const totalFeesEarned = filteredTenants.reduce((sum, t) => sum + t.placement_fee_amount, 0);
  const uniquePropertiesCount = new Set(filteredTenants.map(t => t.property_id)).size;
  const uniqueLandlordsCount = new Set(filteredTenants.map(t => t.landlord_id)).size;

  // Get unique values for filter dropdowns
  const uniqueCities = [...new Set(housedTenants.map(t => t.city).filter(city => city !== 'N/A'))];

  const clearFilters = () => {
    setSearchTerm('');
    setCityFilter('');
    setVoucherFilter('');
    setRentRangeFilter('');
    setLeaseStatusFilter('');
  };

  const handleTenantClick = (tenant: HousedTenant) => {
    setSelectedTenant(tenant);
    setIsProfileModalOpen(true);
  };

  const getLeaseStatus = (tenant: HousedTenant) => {
    if (!tenant.lease_end_date) return { status: 'No End Date', color: 'bg-gray-100 text-gray-800' };
    
    const currentDate = new Date();
    const leaseEnd = new Date(tenant.lease_end_date);
    const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'Expiring in 90 days', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { status: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-gray-600">Loading housed tenants...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalPlacements}</div>
                <div className="text-sm text-muted-foreground">Total Placements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">${totalFeesEarned.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Fees Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{uniquePropertiesCount}</div>
                <div className="text-sm text-muted-foreground">Active Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{uniqueLandlordsCount}</div>
                <div className="text-sm text-muted-foreground">Active Landlords</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with search and filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Housed Tenants</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {filteredTenants.length} of {housedTenants.length} shown
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by property, landlord, tenant name, phone, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
              <Select value={cityFilter} onValueChange={(value) => setCityFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Voucher Status</label>
              <Select value={voucherFilter} onValueChange={(value) => setVoucherFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="yes">Has Voucher</SelectItem>
                  <SelectItem value="no">No Voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rent Range</label>
              <Select value={rentRangeFilter} onValueChange={(value) => setRentRangeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All ranges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ranges</SelectItem>
                  <SelectItem value="under1000">Under $1,000</SelectItem>
                  <SelectItem value="1000to1500">$1,000 - $1,500</SelectItem>
                  <SelectItem value="1500to2000">$1,500 - $2,000</SelectItem>
                  <SelectItem value="over2000">Over $2,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Lease Status</label>
              <Select value={leaseStatusFilter} onValueChange={(value) => setLeaseStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 lg:col-span-4 mt-2">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full flex items-center gap-2"
                size="sm"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls - Top */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between py-3 border-b bg-background rounded-lg px-4 mb-4">
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
              {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} placements
            </span>
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

      {/* Tenant Grid */}
      <div className="h-[600px] overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {paginatedTenants.map((tenant) => (
                  <AdminHousedTenantCard
                    key={tenant.id}
                    tenant={tenant}
                    onViewProfile={handleTenantClick}
                    showQuotaResetButton={true}
                  />
            ))}

            {filteredTenants.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-2">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <div className="text-foreground font-medium">No housed tenants found</div>
                <div className="text-muted-foreground text-sm">
                  {searchTerm || cityFilter || voucherFilter || rentRangeFilter || leaseStatusFilter
                    ? 'Try adjusting your filters'
                    : 'No housed tenants found'
                  }
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Pagination Controls - Bottom */}
      {totalItems > 0 && totalPages > 1 && (
        <div className="flex justify-center pt-4 bg-background rounded-lg px-4 py-3">
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

      {/* Profile Modal */}
      {selectedTenant && (
        <EnhancedTenantProfileModal
          tenantId={selectedTenant.user_id}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default HousedTenantsTable;
