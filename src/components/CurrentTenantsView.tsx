import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { User, Users, Filter } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { useEnhancedHousedTenants } from '@/hooks/useEnhancedHousedTenants';
import { CurrentTenantsTable } from '@/components/enhanced/CurrentTenantsTable';
import { HousedTenantsFilters } from '@/components/enhanced/HousedTenantsFilters';

interface CurrentTenantsViewProps {
  applications: any[];
  onViewProfile: (tenantId: string, propertyId: string) => void;
  onMessage: (applicationId: string) => void;
  onViewLease: (applicationId: string) => void;
}

interface FilterState {
  search: string;
  landlordFilter: string;
  portfolioFilter: string;
  voucherFilter: string;
  communicationFilter: string;
  maintenanceFilter: string;
  performanceFilter: string;
  leaseStatusFilter: string;
}

const CurrentTenantsView = ({ applications, onViewProfile, onMessage, onViewLease }: CurrentTenantsViewProps) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    landlordFilter: '',
    portfolioFilter: '',
    voucherFilter: '',
    communicationFilter: '',
    maintenanceFilter: '',
    performanceFilter: '',
    leaseStatusFilter: ''
  });

  const { data: enhancedTenants = [], isLoading, error } = useEnhancedHousedTenants();

  // Extract unique landlords and portfolios for filters
  const landlords = useMemo(() => {
    const uniqueLandlords = new Map();
    enhancedTenants.forEach(tenant => {
      if (tenant.landlord_info) {
        const id = tenant.landlord_info.id;
        const name = `${tenant.landlord_info.first_name} ${tenant.landlord_info.last_name}`;
        const company = tenant.landlord_info.company_name;
        uniqueLandlords.set(id, { id, name, company });
      }
    });
    return Array.from(uniqueLandlords.values());
  }, [enhancedTenants]);

  const portfolios = useMemo(() => {
    const uniquePortfolios = new Map();
    enhancedTenants.forEach(tenant => {
      if (tenant.portfolio_info) {
        const id = tenant.portfolio_info.id;
        const name = tenant.portfolio_info.name;
        uniquePortfolios.set(id, { id, name });
      }
    });
    return Array.from(uniquePortfolios.values());
  }, [enhancedTenants]);

  // Filter tenants based on current filters
  const filteredTenants = useMemo(() => {
    return enhancedTenants.filter(tenant => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const tenantName = tenant.profiles 
          ? `${tenant.profiles.first_name} ${tenant.profiles.last_name}`.toLowerCase()
          : '';
        const propertyAddress = tenant.properties?.address?.toLowerCase() || '';
        const landlordName = tenant.landlord_info
          ? `${tenant.landlord_info.first_name} ${tenant.landlord_info.last_name}`.toLowerCase()
          : '';
        
        if (!tenantName.includes(searchTerm) && 
            !propertyAddress.includes(searchTerm) && 
            !landlordName.includes(searchTerm)) {
          return false;
        }
      }

      // Landlord filter
      if (filters.landlordFilter && tenant.landlord_info?.id !== filters.landlordFilter) {
        return false;
      }

      // Portfolio filter
      if (filters.portfolioFilter) {
        if (filters.portfolioFilter === 'individual' && tenant.portfolio_info) {
          return false;
        } else if (filters.portfolioFilter !== 'individual' && tenant.portfolio_info?.id !== filters.portfolioFilter) {
          return false;
        }
      }

      // Voucher filter
      if (filters.voucherFilter) {
        const isVoucher = tenant.properties?.has_voucher;
        if (filters.voucherFilter === 'yes' && !isVoucher) return false;
        if (filters.voucherFilter === 'no' && isVoucher) return false;
      }

      // Communication filter
      if (filters.communicationFilter) {
        const unreadCount = tenant.communications_summary.unread_messages;
        const totalMessages = tenant.communications_summary.total_messages;
        
        switch (filters.communicationFilter) {
          case 'unread':
            if (unreadCount === 0) return false;
            break;
          case 'recent':
            if (!tenant.communications_summary.last_message_date) return false;
            // Check if last message was within 7 days
            const lastMessageDate = new Date(tenant.communications_summary.last_message_date);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (lastMessageDate < sevenDaysAgo) return false;
            break;
          case 'no_activity':
            if (totalMessages > 0) return false;
            break;
        }
      }

      // Maintenance filter
      if (filters.maintenanceFilter) {
        const openRequests = tenant.maintenance_summary.open_requests;
        const totalRequests = tenant.maintenance_summary.total_requests;
        
        switch (filters.maintenanceFilter) {
          case 'open':
            if (openRequests === 0) return false;
            break;
          case 'overdue':
            // This would need additional logic to determine overdue requests
            break;
          case 'frequent':
            if (totalRequests < 3) return false; // Arbitrary threshold
            break;
          case 'none':
            if (totalRequests > 0) return false;
            break;
        }
      }

      return true;
    });
  }, [enhancedTenants, filters]);

  // Calculate stats for the filter component
  const stats = useMemo(() => {
    return {
      total: enhancedTenants.length,
      withUnreadMessages: enhancedTenants.filter(t => t.communications_summary.unread_messages > 0).length,
      withOpenMaintenance: enhancedTenants.filter(t => t.maintenance_summary.open_requests > 0).length,
      voucherTenants: enhancedTenants.filter(t => t.properties?.has_voucher).length,
      highPerformers: enhancedTenants.filter(t => 
        t.housing_history.some(h => h.performance_score >= 4.5)
      ).length
    };
  }, [enhancedTenants]);

  if (isLoading) {
    return (
      <CardEnhanced>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Housed Tenants
          </CardEnhancedTitle>
          <CardEnhancedDescription>
            Loading housed tenants...
          </CardEnhancedDescription>
        </CardEnhancedHeader>
        <CardEnhancedContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (error) {
    return (
      <CardEnhanced variant="outlined">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Housed Tenants
          </CardEnhancedTitle>
          <CardEnhancedDescription>
            Error loading housed tenants
          </CardEnhancedDescription>
        </CardEnhancedHeader>
        <CardEnhancedContent className="text-center py-12">
          <p className="text-muted-foreground">
            Failed to load housed tenants data. Please try again.
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (enhancedTenants.length === 0) {
    return (
      <CardEnhanced variant="outlined">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Housed Tenants
          </CardEnhancedTitle>
          <CardEnhancedDescription>
            No housed tenants found
          </CardEnhancedDescription>
        </CardEnhancedHeader>
        <CardEnhancedContent className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Housed Tenants</h3>
          <p className="text-muted-foreground">
            There are no approved tenants currently housed in properties.
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <>
      {/* Gradient Hero Section */}
      <div className="bg-gradient-blue-gold rounded-lg p-8 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Users className="h-8 w-8" />
              Housed Tenants Management
            </h1>
            <p className="text-white/90 text-lg">
              Comprehensive tenant oversight with landlord relationships, communications, and maintenance tracking
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-white/80 text-sm">Total Tenants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.voucherTenants}</div>
              <div className="text-white/80 text-sm">Section 8</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.withUnreadMessages}</div>
              <div className="text-white/80 text-sm">Need Attention</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Enhanced Filters */}
        <HousedTenantsFilters
          filters={filters}
          onFiltersChange={setFilters}
          landlords={landlords}
          portfolios={portfolios}
          stats={stats}
        />

        {/* Enhanced Tenant Cards */}
        <div className="space-y-4">
          {filteredTenants.length === 0 ? (
            <CardEnhanced>
              <CardEnhancedContent className="text-center py-12">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Tenants Match Filters</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters to see more results.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setFilters({
                    search: '',
                    landlordFilter: '',
                    portfolioFilter: '',
                    voucherFilter: '',
                    communicationFilter: '',
                    maintenanceFilter: '',
                    performanceFilter: '',
                    leaseStatusFilter: ''
                  })}
                >
                  Clear All Filters
                </Button>
              </CardEnhancedContent>
            </CardEnhanced>
          ) : (
            <CurrentTenantsTable tenants={filteredTenants} />
          )}
        </div>

        {/* Results Summary */}
        {filteredTenants.length > 0 && filteredTenants.length !== enhancedTenants.length && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredTenants.length} of {enhancedTenants.length} housed tenants
          </div>
        )}
      </div>
    </>
  );
};

export default CurrentTenantsView;
