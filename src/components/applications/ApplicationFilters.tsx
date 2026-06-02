import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';

interface ApplicationFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  totalCount: number;
  filteredCount: number;
}

export const ApplicationFilters = ({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount
}: ApplicationFiltersProps) => {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties, applicants..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border rounded-lg focus:ring-2 focus:ring-openkey-blue focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-openkey-blue focus:border-transparent bg-white min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-openkey-blue focus:border-transparent bg-white min-w-[140px]"
            >
              <option value="created_at">Application Date</option>
              <option value="status">Status</option>
              <option value="tenant_score">Tenant Score</option>
              <option value="rent">Rent Amount</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Results Count */}
          <Badge variant="outline" className="px-3 py-1">
            {filteredCount} of {totalCount} applications
          </Badge>

          {/* Clear Filters */}
          {(searchTerm || filterStatus !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onFilterChange('all');
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchTerm || filterStatus !== 'all') && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-sm text-gray-600">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchTerm}"
              <button
                onClick={() => onSearchChange('')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {filterStatus !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filterStatus}
              <button
                onClick={() => onFilterChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};