
import React from 'react';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PropertyFilters {
  status: string;
  propertyType: string;
  portfolio: string;
  owner: string;
  dateAdded: string;
  rentRange: string;
  location: string;
  marketStatus: string;
  tenantStatus: string;
}

interface FilterCounts {
  all: number;
  available: number;
  occupied: number;
  vacant: number;
  for_sale: number;
  under_contract: number;
  maintenance: number;
  residential: number;
  commercial: number;
  specialty: number;
  independent: number;
  large_portfolios: number;
  medium_portfolios: number;
  small_portfolios: number;
  portfolios: { [key: string]: number };
  owners: { [key: string]: number };
  rentRanges: { [key: string]: number };
  locations: { [key: string]: number };
  on_market: number;
  off_market: number;
  with_tenant: number;
  without_tenant: number;
}

interface Portfolio {
  id: string;
  client_name: string;
}

interface ProcessedOwner {
  id: string;
  name: string;
}

interface Location {
  city: string;
  state: string;
}

interface PropertiesDirectoryFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (filters: PropertyFilters) => void;
  filterCounts: FilterCounts;
  portfolios: Portfolio[];
  owners: ProcessedOwner[];
  locations: Location[];
  showCounts?: boolean;
  dynamicCounts?: {
    status: FilterCounts;
    propertyType: FilterCounts;
    portfolio: FilterCounts;
    owner: FilterCounts;
    dateAdded: FilterCounts;
    rentRange: FilterCounts;
    location: FilterCounts;
    marketStatus: FilterCounts;
    tenantStatus: FilterCounts;
  };
}

const PropertiesDirectoryFilters: React.FC<PropertiesDirectoryFiltersProps> = ({
  filters,
  onFilterChange,
  filterCounts,
  portfolios,
  owners,
  locations,
  showCounts = true,
  dynamicCounts,
}) => {
  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const formatCount = (count: number) => showCounts ? ` (${count})` : '';
  
  // Use dynamic counts when available, fallback to static counts
  const getCountsFor = (category: keyof typeof dynamicCounts) => {
    return dynamicCounts ? dynamicCounts[category] : filterCounts;
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Property Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Properties{formatCount(getCountsFor('status').all)}</SelectItem>
              {getCountsFor('status').available > 0 && (
                <SelectItem value="available">Available{formatCount(getCountsFor('status').available)}</SelectItem>
              )}
              {getCountsFor('status').occupied > 0 && (
                <SelectItem value="occupied">Occupied{formatCount(getCountsFor('status').occupied)}</SelectItem>
              )}
              {getCountsFor('status').vacant > 0 && (
                <SelectItem value="vacant">Vacant{formatCount(getCountsFor('status').vacant)}</SelectItem>
              )}
              {getCountsFor('status').for_sale > 0 && (
                <SelectItem value="for_sale">For Sale{formatCount(getCountsFor('status').for_sale)}</SelectItem>
              )}
              {getCountsFor('status').under_contract > 0 && (
                <SelectItem value="under_contract">Under Contract{formatCount(getCountsFor('status').under_contract)}</SelectItem>
              )}
              {getCountsFor('status').maintenance > 0 && (
                <SelectItem value="maintenance">Maintenance{formatCount(getCountsFor('status').maintenance)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Property Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Property Type</label>
          <Select value={filters.propertyType} onValueChange={(value) => handleFilterChange('propertyType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Types{formatCount(getCountsFor('propertyType').all)}</SelectItem>
              {getCountsFor('propertyType').residential > 0 && (
                <SelectItem value="residential">Residential{formatCount(getCountsFor('propertyType').residential)}</SelectItem>
              )}
              {getCountsFor('propertyType').commercial > 0 && (
                <SelectItem value="commercial">Commercial{formatCount(getCountsFor('propertyType').commercial)}</SelectItem>
              )}
              {getCountsFor('propertyType').specialty > 0 && (
                <SelectItem value="specialty">Specialty{formatCount(getCountsFor('propertyType').specialty)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Market Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Market Status</label>
          <Select value={filters.marketStatus} onValueChange={(value) => handleFilterChange('marketStatus', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Market Status{formatCount(getCountsFor('marketStatus').all)}</SelectItem>
              <SelectItem value="on_market">On Market{formatCount(getCountsFor('marketStatus').on_market)}</SelectItem>
              <SelectItem value="off_market">Off Market{formatCount(getCountsFor('marketStatus').off_market)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tenant Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tenant Status</label>
          <Select value={filters.tenantStatus} onValueChange={(value) => handleFilterChange('tenantStatus', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Properties{formatCount(getCountsFor('tenantStatus').all)}</SelectItem>
              <SelectItem value="with_tenant">With Tenant{formatCount(getCountsFor('tenantStatus').with_tenant)}</SelectItem>
              <SelectItem value="without_tenant">Without Tenant{formatCount(getCountsFor('tenantStatus').without_tenant)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Portfolio Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Portfolio</label>
          <Select value={filters.portfolio} onValueChange={(value) => handleFilterChange('portfolio', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Properties{formatCount(getCountsFor('portfolio').all)}</SelectItem>
              {getCountsFor('portfolio').independent > 0 && (
                <SelectItem value="independent">Independent{formatCount(getCountsFor('portfolio').independent)}</SelectItem>
              )}
              {getCountsFor('portfolio').large_portfolios > 0 && (
                <SelectItem value="large_portfolios">Large Portfolios (10+){formatCount(getCountsFor('portfolio').large_portfolios)}</SelectItem>
              )}
              {getCountsFor('portfolio').medium_portfolios > 0 && (
                <SelectItem value="medium_portfolios">Medium Portfolios (5-9){formatCount(getCountsFor('portfolio').medium_portfolios)}</SelectItem>
              )}
              {getCountsFor('portfolio').small_portfolios > 0 && (
                <SelectItem value="small_portfolios">Small Portfolios (1-4){formatCount(getCountsFor('portfolio').small_portfolios)}</SelectItem>
              )}
              {portfolios.map(portfolio => {
                const count = getCountsFor('portfolio').portfolios[portfolio.id] || 0;
                if (count === 0) return null;
                return (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.client_name}{formatCount(count)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Owner Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Owner</label>
          <Select value={filters.owner} onValueChange={(value) => handleFilterChange('owner', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Owners{formatCount(getCountsFor('owner').all)}</SelectItem>
              {owners.map(owner => {
                const count = getCountsFor('owner').owners[owner.id] || 0;
                if (count === 0) return null;
                return (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name}{formatCount(count)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Date Added Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Date Added</label>
          <Select value={filters.dateAdded} onValueChange={(value) => handleFilterChange('dateAdded', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">Any Time{formatCount(getCountsFor('dateAdded').all)}</SelectItem>
              <SelectItem value="30_days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rent Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Rent Range</label>
          <Select value={filters.rentRange} onValueChange={(value) => handleFilterChange('rentRange', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Rent Ranges{formatCount(getCountsFor('rentRange').all)}</SelectItem>
              {(getCountsFor('rentRange').rentRanges['under_1000'] || 0) > 0 && (
                <SelectItem value="under_1000">Under $1,000{formatCount(getCountsFor('rentRange').rentRanges['under_1000'] || 0)}</SelectItem>
              )}
              {(getCountsFor('rentRange').rentRanges['1000_2000'] || 0) > 0 && (
                <SelectItem value="1000_2000">$1,000 - $2,000{formatCount(getCountsFor('rentRange').rentRanges['1000_2000'] || 0)}</SelectItem>
              )}
              {(getCountsFor('rentRange').rentRanges['2000_3000'] || 0) > 0 && (
                <SelectItem value="2000_3000">$2,000 - $3,000{formatCount(getCountsFor('rentRange').rentRanges['2000_3000'] || 0)}</SelectItem>
              )}
              {(getCountsFor('rentRange').rentRanges['3000_5000'] || 0) > 0 && (
                <SelectItem value="3000_5000">$3,000 - $5,000{formatCount(getCountsFor('rentRange').rentRanges['3000_5000'] || 0)}</SelectItem>
              )}
              {(getCountsFor('rentRange').rentRanges['over_5000'] || 0) > 0 && (
                <SelectItem value="over_5000">Over $5,000{formatCount(getCountsFor('rentRange').rentRanges['over_5000'] || 0)}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Location</label>
          <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Locations{formatCount(getCountsFor('location').all)}</SelectItem>
              {locations.map(location => {
                const locationKey = `${location.city}, ${location.state}`;
                const count = getCountsFor('location').locations[locationKey] || 0;
                if (count === 0) return null;
                return (
                  <SelectItem key={locationKey} value={locationKey}>
                    {locationKey}{formatCount(count)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default PropertiesDirectoryFilters;
