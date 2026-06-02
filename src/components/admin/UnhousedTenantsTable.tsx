
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  DollarSign, 
  MapPin, 
  Phone, 
  CreditCard, 
  Filter,
  X,
  User,
  Briefcase,
  Eye
} from 'lucide-react';
import { EnhancedTenantProfileModal } from './EnhancedTenantProfileModal';
import { AdminSeekingTenantCard } from './AdminSeekingTenantCard';

interface UnhousedTenant {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  voucher_holder: boolean;
  voucher_amount: number;
  monthly_income: string | number;
  max_rent: number;
  credit_score: number;
  employment_status: string;
  preferred_locations: string[];
  city: string;
  zip_code: string;
  message_credits: number;
  is_plus_subscriber: boolean;
  email?: string;
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
}

const UnhousedTenantsTable = () => {
  const [unhousedTenants, setUnhousedTenants] = useState<UnhousedTenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<UnhousedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [creditScoreFilter, setCreditScoreFilter] = useState('');
  const [zipCodeFilter, setZipCodeFilter] = useState('');
  const [incomeFilter, setIncomeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<UnhousedTenant | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchUnhousedTenants();
  }, []);

  // Filter tenants based on all criteria
  useEffect(() => {
    let filtered = unhousedTenants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.phone.includes(searchTerm) ||
        tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.employment_status.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Employment filter
    if (employmentFilter) {
      filtered = filtered.filter(tenant => tenant.employment_status === employmentFilter);
    }

    // Credit score filter
    if (creditScoreFilter) {
      if (creditScoreFilter === 'excellent') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 750);
      } else if (creditScoreFilter === 'good') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 670 && tenant.credit_score < 750);
      } else if (creditScoreFilter === 'fair') {
        filtered = filtered.filter(tenant => tenant.credit_score >= 580 && tenant.credit_score < 670);
      } else if (creditScoreFilter === 'poor') {
        filtered = filtered.filter(tenant => tenant.credit_score > 0 && tenant.credit_score < 580);
      }
    }

    // Zip code filter
    if (zipCodeFilter) {
      filtered = filtered.filter(tenant => tenant.zip_code === zipCodeFilter);
    }

    // Income filter
    if (incomeFilter) {
      const parseIncome = (val: string | number) => typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      if (incomeFilter === 'under3000') {
        filtered = filtered.filter(tenant => parseIncome(tenant.monthly_income) < 3000);
      } else if (incomeFilter === '3000to5000') {
        filtered = filtered.filter(tenant => parseIncome(tenant.monthly_income) >= 3000 && parseIncome(tenant.monthly_income) <= 5000);
      } else if (incomeFilter === '5000to7000') {
        filtered = filtered.filter(tenant => parseIncome(tenant.monthly_income) >= 5000 && parseIncome(tenant.monthly_income) <= 7000);
      } else if (incomeFilter === 'over7000') {
        filtered = filtered.filter(tenant => parseIncome(tenant.monthly_income) > 7000);
      }
    }

    setFilteredTenants(filtered);
  }, [unhousedTenants, searchTerm, cityFilter, voucherFilter, employmentFilter, creditScoreFilter, zipCodeFilter, incomeFilter]);

  const fetchUnhousedTenants = async () => {
    try {
      // Get all tenant profiles with their profile info
      const { data: tenantProfilesData, error } = await supabase
        .from('tenant_profiles')
        .select(`
          *,
          profiles!tenant_profiles_user_id_fkey (
            first_name,
            last_name,
            phone
          )
        `);

      if (error) {
        console.error('Error fetching tenant profiles:', error);
        return;
      }

      // Get tenants who have approved applications (considered housed)
      const { data: approvedApplications } = await supabase
        .from('property_applications')
        .select('tenant_id')
        .eq('status', 'approved');

      const housedTenantIds = new Set(approvedApplications?.map(app => app.tenant_id) || []);

      // Filter out housed tenants and transform data
      const unhousedData = tenantProfilesData
        ?.filter(tenant => tenant && !housedTenantIds.has(tenant.user_id))
        .map(tenant => {
          const firstName = tenant.profiles?.first_name || '';
          const lastName = tenant.profiles?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          return {
            id: tenant.id,
            user_id: tenant.user_id,
            full_name: fullName || `Tenant ${tenant.id.slice(0, 8)}`,
            phone: tenant.profiles?.phone || 'N/A',
            voucher_holder: tenant.voucher_holder || false,
            voucher_amount: tenant.voucher_amount || 0,
            monthly_income: tenant.monthly_income || '0',
            max_rent: tenant.max_rent || 1000,
            credit_score: tenant.credit_score || 0,
            employment_status: tenant.employment_status || 'N/A',
            preferred_locations: tenant.preferred_locations || [],
            city: tenant.city || 'N/A',
            zip_code: tenant.zip_code || 'N/A',
            message_credits: tenant.message_credits || 0,
            is_plus_subscriber: tenant.is_plus_subscriber || false,
            email: `${firstName?.toLowerCase() || 'tenant'}@demo.com`,
            housing_authority: tenant.housing_authority,
            move_in_window: tenant.move_in_window,
            has_pets: tenant.has_pets,
            pet_type: tenant.pet_type,
            has_accessibility_needs: tenant.has_accessibility_needs,
            accessibility_details: tenant.accessibility_details,
            has_eviction: tenant.has_eviction,
            eviction_details: tenant.eviction_details,
            has_felonies: tenant.has_felonies,
            felony_details: tenant.felony_details,
          };
        }) || [];

      setUnhousedTenants(unhousedData);
    } catch (error) {
      console.error('Error fetching unhoused tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filter dropdowns
  const uniqueCities = [...new Set(unhousedTenants.map(t => t.city).filter(city => city !== 'N/A'))];
  const uniqueEmploymentStatus = [...new Set(unhousedTenants.map(t => t.employment_status).filter(status => status !== 'N/A'))];
  const uniqueZipCodes = [...new Set(unhousedTenants.map(t => t.zip_code).filter(zip => zip !== 'N/A'))];

  const clearFilters = () => {
    setSearchTerm('');
    setCityFilter('');
    setVoucherFilter('');
    setEmploymentFilter('');
    setCreditScoreFilter('');
    setZipCodeFilter('');
    setIncomeFilter('');
  };

  const handleViewProfile = (tenant: UnhousedTenant) => {
    setSelectedTenant(tenant);
    setIsProfileModalOpen(true);
  };

  const handleMessage = (tenantId: string) => {
    // TODO: Implement messaging functionality
    console.log('Message tenant:', tenantId);
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 670) return 'text-blue-600';
    if (score >= 580) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-gray-600">Loading tenants...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Seeking Housing</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {filteredTenants.length} of {unhousedTenants.length} shown
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
            placeholder="Search by name, phone, email, city, or employment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg border">
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Zip Code</label>
              <Select value={zipCodeFilter} onValueChange={(value) => setZipCodeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All zip codes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zip codes</SelectItem>
                  {uniqueZipCodes.map(zip => (
                    <SelectItem key={zip} value={zip}>{zip}</SelectItem>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Employment</label>
              <Select value={employmentFilter} onValueChange={(value) => setEmploymentFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All employment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employment</SelectItem>
                  {uniqueEmploymentStatus.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Credit Score</label>
              <Select value={creditScoreFilter} onValueChange={(value) => setCreditScoreFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scores</SelectItem>
                  <SelectItem value="excellent">Excellent (750+)</SelectItem>
                  <SelectItem value="good">Good (670-749)</SelectItem>
                  <SelectItem value="fair">Fair (580-669)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;580)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Yearly Income</label>
              <Select value={incomeFilter} onValueChange={(value) => setIncomeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All ranges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ranges</SelectItem>
                  <SelectItem value="under3000">Under $3,000</SelectItem>
                  <SelectItem value="3000to5000">$3,000 - $5,000</SelectItem>
                  <SelectItem value="5000to7000">$5,000 - $7,000</SelectItem>
                  <SelectItem value="over7000">Over $7,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 lg:col-span-6 mt-2">
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

      {/* Tenant Grid */}
      <div className="h-[600px] overflow-hidden">
        <ScrollArea className="h-full border rounded-lg">
          <div className="p-4 space-y-4">
            {filteredTenants.map((tenant) => (
              <AdminSeekingTenantCard
                key={tenant.id}
                tenant={tenant}
                onViewProfile={handleViewProfile}
                onMessage={handleMessage}
                showQuotaResetButton={true}
              />
            ))}

            {filteredTenants.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <div className="text-gray-600 font-medium">No tenants found</div>
                <div className="text-gray-500 text-sm">
                  {searchTerm || cityFilter || voucherFilter || employmentFilter || creditScoreFilter || zipCodeFilter || incomeFilter
                    ? 'Try adjusting your filters'
                    : 'No unhoused tenants found'
                  }
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Tenant Profile Modal */}
      {selectedTenant && (
        <EnhancedTenantProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          tenantId={selectedTenant.user_id}
        />
      )}
    </div>
  );
};

export default UnhousedTenantsTable;
