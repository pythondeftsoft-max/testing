
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  MessageCircle, 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';

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

interface HousedTenantsFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  landlords: Array<{ id: string; name: string; company?: string }>;
  portfolios: Array<{ id: string; name: string }>;
  stats: {
    total: number;
    withUnreadMessages: number;
    withOpenMaintenance: number;
    voucherTenants: number;
    highPerformers: number;
  };
}

export const HousedTenantsFilters = ({
  filters,
  onFiltersChange,
  landlords,
  portfolios,
  stats
}: HousedTenantsFiltersProps) => {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? '' : value
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      landlordFilter: '',
      portfolioFilter: '',
      voucherFilter: '',
      communicationFilter: '',
      maintenanceFilter: '',
      performanceFilter: '',
      leaseStatusFilter: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Housed Tenants Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Tenants</div>
          </div>
          <div 
            className="text-center cursor-pointer hover:bg-blue-50 rounded p-1 transition-colors"
            onClick={() => updateFilter('communicationFilter', stats.withUnreadMessages > 0 ? 'unread' : '')}
          >
            <div className="text-lg font-semibold text-blue-600 flex items-center justify-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{stats.withUnreadMessages}</span>
            </div>
            <div className="text-xs text-muted-foreground">Unread Messages</div>
          </div>
          <div 
            className="text-center cursor-pointer hover:bg-orange-50 rounded p-1 transition-colors"
            onClick={() => updateFilter('maintenanceFilter', stats.withOpenMaintenance > 0 ? 'open' : '')}
          >
            <div className="text-lg font-semibold text-orange-600 flex items-center justify-center space-x-1">
              <Wrench className="h-4 w-4" />
              <span>{stats.withOpenMaintenance}</span>
            </div>
            <div className="text-xs text-muted-foreground">Open Maintenance</div>
          </div>
          <div 
            className="text-center cursor-pointer hover:bg-green-50 rounded p-1 transition-colors"
            onClick={() => updateFilter('voucherFilter', stats.voucherTenants > 0 ? 'yes' : '')}
          >
            <div className="text-lg font-semibold text-green-600">{stats.voucherTenants}</div>
            <div className="text-xs text-muted-foreground">Section 8</div>
          </div>
          <div 
            className="text-center cursor-pointer hover:bg-yellow-50 rounded p-1 transition-colors"
            onClick={() => updateFilter('performanceFilter', stats.highPerformers > 0 ? 'high' : '')}
          >
            <div className="text-lg font-semibold text-yellow-600 flex items-center justify-center space-x-1">
              <Star className="h-4 w-4" />
              <span>{stats.highPerformers}</span>
            </div>
            <div className="text-xs text-muted-foreground">High Performers</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants, properties, landlords..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.landlordFilter} onValueChange={(value) => updateFilter('landlordFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Landlords" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Landlords</SelectItem>
              {landlords.map((landlord) => (
                <SelectItem key={landlord.id} value={landlord.id}>
                  {landlord.name}
                  {landlord.company && ` (${landlord.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.portfolioFilter} onValueChange={(value) => updateFilter('portfolioFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem value="individual">Individual Properties</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.voucherFilter} onValueChange={(value) => updateFilter('voucherFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="yes">Section 8 Only</SelectItem>
              <SelectItem value="no">Non-Section 8 Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.communicationFilter} onValueChange={(value) => updateFilter('communicationFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Communication Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Communications</SelectItem>
              <SelectItem value="unread">Has Unread Messages</SelectItem>
              <SelectItem value="recent">Recent Activity</SelectItem>
              <SelectItem value="no_activity">No Recent Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={filters.maintenanceFilter} onValueChange={(value) => updateFilter('maintenanceFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Maintenance Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Maintenance</SelectItem>
              <SelectItem value="open">Open Requests</SelectItem>
              <SelectItem value="overdue">Overdue Requests</SelectItem>
              <SelectItem value="frequent">Frequent Requests</SelectItem>
              <SelectItem value="none">No Requests</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.performanceFilter} onValueChange={(value) => updateFilter('performanceFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Performance Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Performance</SelectItem>
              <SelectItem value="high">High Performers (4.5+)</SelectItem>
              <SelectItem value="good">Good Performers (3.5-4.4)</SelectItem>
              <SelectItem value="needs_attention">Needs Attention (&lt;3.5)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.leaseStatusFilter} onValueChange={(value) => updateFilter('leaseStatusFilter', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Lease Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leases</SelectItem>
              <SelectItem value="expiring_30">Expiring in 30 Days</SelectItem>
              <SelectItem value="expiring_60">Expiring in 60 Days</SelectItem>
              <SelectItem value="expiring_90">Expiring in 90 Days</SelectItem>
              <SelectItem value="renewed">Recently Renewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.search && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>Search: "{filters.search}"</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('search', '')}
                />
              </Badge>
            )}
            {filters.communicationFilter && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <MessageCircle className="h-3 w-3" />
                <span>Communications</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('communicationFilter', '')}
                />
              </Badge>
            )}
            {filters.maintenanceFilter && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Wrench className="h-3 w-3" />
                <span>Maintenance</span>
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('maintenanceFilter', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
