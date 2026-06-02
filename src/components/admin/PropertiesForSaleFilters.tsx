import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Download, CheckSquare } from 'lucide-react';

interface FilterState {
  search: string;
  status: string;
  condition: string;
  priceRange: string;
  location: string;
  dateRange: string;
}

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onExport: () => void;
  onBulkAction: (action: string) => void;
  selectedCount: number;
  totalCount: number;
}

export const PropertiesForSaleFilters = ({
  filters,
  onFilterChange,
  onExport,
  onBulkAction,
  selectedCount,
  totalCount
}: FiltersProps) => {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: 'all',
      condition: 'all',
      priceRange: 'all',
      location: '',
      dateRange: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'all');

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Actions
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {selectedCount} selected
                </Badge>
                <Select onValueChange={onBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Bulk actions..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mark_reviewed">Mark as Reviewed</SelectItem>
                    <SelectItem value="mark_active">Mark as Active</SelectItem>
                    <SelectItem value="mark_cancelled">Mark as Cancelled</SelectItem>
                    <SelectItem value="export_selected">Export Selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Address, owner..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Condition</label>
            <Select value={filters.condition} onValueChange={(value) => updateFilter('condition', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="needs_renovation">Needs Renovation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Price Range</label>
            <Select value={filters.priceRange} onValueChange={(value) => updateFilter('priceRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-50000">Under $50k</SelectItem>
                <SelectItem value="50000-100000">$50k - $100k</SelectItem>
                <SelectItem value="100000-200000">$100k - $200k</SelectItem>
                <SelectItem value="200000-500000">$200k - $500k</SelectItem>
                <SelectItem value="500000+">$500k+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <Input
              placeholder="City, state..."
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Date Range</label>
            <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {totalCount} properties
            </div>
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};