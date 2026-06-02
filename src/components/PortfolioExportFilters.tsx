
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface ExportData {
  propertyId: string;
  propertyAddress: string;
  unitIdentifier: string;
  occupancy: string;
  occupancyStatus: string;
  bedrooms: number | null;
  bathrooms: number | null;
  totalRent: number;
  voucherPayment: number;
  tenantPayment: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: string;
  forSaleStatus: string;
  marketingPrice: number | null;
}

interface PortfolioExportFiltersProps {
  data: ExportData[];
  onFilterChange: (filteredData: ExportData[]) => void;
}

const PortfolioExportFilters = ({ data, onFilterChange }: PortfolioExportFiltersProps) => {
  const [filters, setFilters] = useState({
    status: 'all',
    forSaleStatus: 'all',
    leaseStartAfter: '',
    leaseStartBefore: '',
    leaseEndAfter: '',
    leaseEndBefore: '',
    minRent: '',
    maxRent: '',
  });

  useEffect(() => {
    applyFilters();
  }, [filters, data]);

  const applyFilters = () => {
    let filtered = [...data];

    // Status filter - check occupancy status for occupied/vacant
    if (filters.status !== 'all') {
      if (filters.status === 'occupied' || filters.status === 'vacant') {
        filtered = filtered.filter(item => item.occupancyStatus === filters.status);
      } else {
        // For other statuses like 'available', check listing status
        filtered = filtered.filter(item => item.status === filters.status);
      }
    }

    // For Sale filter
    if (filters.forSaleStatus !== 'all') {
      filtered = filtered.filter(item => item.forSaleStatus === filters.forSaleStatus);
    }

    // Date filters
    if (filters.leaseStartAfter) {
      filtered = filtered.filter(item => 
        item.leaseStartDate && item.leaseStartDate >= filters.leaseStartAfter
      );
    }
    if (filters.leaseStartBefore) {
      filtered = filtered.filter(item => 
        item.leaseStartDate && item.leaseStartDate <= filters.leaseStartBefore
      );
    }
    if (filters.leaseEndAfter) {
      filtered = filtered.filter(item => 
        item.leaseEndDate && item.leaseEndDate >= filters.leaseEndAfter
      );
    }
    if (filters.leaseEndBefore) {
      filtered = filtered.filter(item => 
        item.leaseEndDate && item.leaseEndDate <= filters.leaseEndBefore
      );
    }

    // Rent filters
    if (filters.minRent) {
      filtered = filtered.filter(item => item.totalRent >= Number(filters.minRent));
    }
    if (filters.maxRent) {
      filtered = filtered.filter(item => item.totalRent <= Number(filters.maxRent));
    }

    onFilterChange(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      forSaleStatus: 'all',
      leaseStartAfter: '',
      leaseStartBefore: '',
      leaseEndAfter: '',
      leaseEndBefore: '',
      minRent: '',
      maxRent: '',
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="status">Property Status</Label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="forSaleStatus">For Sale Status</Label>
            <Select value={filters.forSaleStatus} onValueChange={(value) => handleFilterChange('forSaleStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All sale statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sale Statuses</SelectItem>
                <SelectItem value="For Sale">For Sale</SelectItem>
                <SelectItem value="Not For Sale">Not For Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="leaseStartAfter">Lease Start After</Label>
            <Input
              id="leaseStartAfter"
              type="date"
              value={filters.leaseStartAfter}
              onChange={(e) => handleFilterChange('leaseStartAfter', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="leaseStartBefore">Lease Start Before</Label>
            <Input
              id="leaseStartBefore"
              type="date"
              value={filters.leaseStartBefore}
              onChange={(e) => handleFilterChange('leaseStartBefore', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="leaseEndAfter">Lease End After</Label>
            <Input
              id="leaseEndAfter"
              type="date"
              value={filters.leaseEndAfter}
              onChange={(e) => handleFilterChange('leaseEndAfter', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="leaseEndBefore">Lease End Before</Label>
            <Input
              id="leaseEndBefore"
              type="date"
              value={filters.leaseEndBefore}
              onChange={(e) => handleFilterChange('leaseEndBefore', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="minRent">Min Rent</Label>
            <Input
              id="minRent"
              type="number"
              placeholder="0"
              value={filters.minRent}
              onChange={(e) => handleFilterChange('minRent', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="maxRent">Max Rent</Label>
            <Input
              id="maxRent"
              type="number"
              placeholder="10000"
              value={filters.maxRent}
              onChange={(e) => handleFilterChange('maxRent', e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioExportFilters;
