import React from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { X, Filter, Loader2, Calendar, Building2, Tags, FolderOpen } from 'lucide-react';
import { useAdvancedFilterOptions } from '@/hooks/useAdvancedFilterOptions';
import { useFilterConflictResolution } from '@/hooks/useFilterConflictResolution';
import { OperationalFilters } from '@/hooks/useOperationalFilters';

// Filter adapter to convert OperationalFilters to PropertyFilters interface
const createPropertyFiltersAdapter = (operationalFilters: OperationalFilters) => ({
  selectedPropertyTypes: operationalFilters.selectedPropertyTypes,
  selectedPortfolios: operationalFilters.selectedPortfolios,
  selectedProperties: operationalFilters.selectedProperties,
  dateRange: operationalFilters.dateRange,
});

interface OperationalFiltersPanelProps {
  filters: OperationalFilters;
  updateFilter: <K extends keyof OperationalFilters>(key: K, value: OperationalFilters[K]) => void;
  isApplying?: boolean;
  userId: string;
  portfolioId?: string;
}

export const OperationalFiltersPanel: React.FC<OperationalFiltersPanelProps> = ({
  filters,
  updateFilter,
  isApplying = false,
  userId,
  portfolioId
}) => {
  const showPortfolioFilter = portfolioId === "everything";
  
  // Convert OperationalFilters to PropertyFilters for compatibility
  const propertyFilters = createPropertyFiltersAdapter(filters);
  
  // Use dynamic filter options with cascading behavior
  const { data: filterOptions, isLoading: isLoadingOptions } = useAdvancedFilterOptions(
    userId,
    showPortfolioFilter ? undefined : portfolioId,
    propertyFilters
  );

  // Conflict resolution for cascading filters with adapter
  const propertyFilterUpdateAdapter = <K extends keyof typeof propertyFilters>(
    key: K, 
    value: typeof propertyFilters[K]
  ) => {
    updateFilter(key as keyof OperationalFilters, value as any);
  };

  const { 
    resolveConflictsAfterPortfolioChange,
    resolveConflictsAfterPropertyTypeChange,
    resolveConflictsAfterPropertyChange
  } = useFilterConflictResolution(propertyFilters, propertyFilterUpdateAdapter);

  const activeFiltersCount = [
    showPortfolioFilter && filters.selectedPortfolios.length > 0,
    filters.selectedProperties.length > 0,
    filters.selectedPropertyTypes.length > 0,
  ].filter(Boolean).length;

  const handlePortfolioChange = (newPortfolios: string[]) => {
    updateFilter('selectedPortfolios', newPortfolios);
    if (filterOptions) {
      resolveConflictsAfterPortfolioChange(newPortfolios, filterOptions);
    }
  };

  const handlePropertyTypeChange = (newPropertyTypes: string[]) => {
    updateFilter('selectedPropertyTypes', newPropertyTypes);
    if (filterOptions) {
      resolveConflictsAfterPropertyTypeChange(newPropertyTypes, filterOptions);
    }
  };

  const handlePropertyChange = (newProperties: string[]) => {
    updateFilter('selectedProperties', newProperties);
    if (filterOptions) {
      resolveConflictsAfterPropertyChange(newProperties, filterOptions);
    }
  };

  const clearFilters = () => {
    updateFilter('selectedPortfolios', []);
    updateFilter('selectedPropertyTypes', []);
    updateFilter('selectedProperties', []);
  };

  return (
    <CardEnhanced className="mb-6">
      <CardEnhancedContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-base">Operational Performance Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
            {isApplying && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating...
              </div>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-sm h-8 px-3"
            >
              Clear All
              <X className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Property and Portfolio Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showPortfolioFilter && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground">Portfolios</label>
                </div>
                <MultiSelect
                  options={filterOptions?.portfolioOptions || []}
                  selected={filters.selectedPortfolios}
                  onChange={handlePortfolioChange}
                  placeholder={isLoadingOptions ? "Loading portfolios..." : "All portfolios"}
                  className="h-9"
                />
              </div>
            )}

            {/* Property Type Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Property Types</label>
              </div>
              <MultiSelect
                options={filterOptions?.propertyTypeOptions || []}
                selected={filters.selectedPropertyTypes}
                onChange={handlePropertyTypeChange}
                placeholder={isLoadingOptions ? "Loading types..." : 
                  filters.selectedPortfolios.length > 0 ? "Types in selected portfolios" : "All types"}
                className="h-9"
              />
            </div>

            {/* Property Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Properties</label>
              </div>
              <MultiSelect
                options={filterOptions?.propertyOptions || []}
                selected={filters.selectedProperties}
                onChange={handlePropertyChange}
                placeholder={isLoadingOptions ? "Loading properties..." : 
                  filters.selectedPortfolios.length > 0 || filters.selectedPropertyTypes.length > 0 
                    ? "Properties matching filters" : "All properties"}
                className="h-9"
              />
            </div>

            {/* Date Range Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Date Range</label>
              </div>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => updateFilter('dateRange', range)}
                className="w-full"
              />
            </div>
          </div>


        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};