import React from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { X, Filter, Loader2, Calendar, Building2, Tags, FolderOpen } from 'lucide-react';
import { useAdvancedFilterOptions } from '@/hooks/useAdvancedFilterOptions';
import { useFilterConflictResolution } from '@/hooks/useFilterConflictResolution';
import { TenantFilters } from '@/hooks/useTenantFilters';

interface TenantFiltersPanelProps {
  filters: TenantFilters;
  onDateRangeChange: (dateRange: { from: Date | undefined; to: Date | undefined }) => void;
  onPropertiesChange: (properties: string[]) => void;
  onPropertyTypesChange: (types: string[]) => void;
  onPortfoliosChange: (portfolios: string[]) => void;
  onClearFilters: () => void;
  isApplying: boolean;
  userId: string;
  portfolioId?: string;
  updateFilter: <K extends keyof Pick<TenantFilters, 'selectedProperties' | 'selectedPropertyTypes' | 'selectedPortfolios' | 'dateRange'>>(
    key: K, 
    value: TenantFilters[K]
  ) => void;
}

export const TenantFiltersPanel: React.FC<TenantFiltersPanelProps> = ({
  filters,
  onDateRangeChange,
  onPropertiesChange,
  onPropertyTypesChange,
  onPortfoliosChange,
  onClearFilters,
  isApplying,
  userId,
  portfolioId,
  updateFilter,
}) => {
  // Use dynamic cascading filter options
  const { data: advancedOptions, isLoading: isLoadingOptions } = useAdvancedFilterOptions(
    userId, 
    portfolioId, 
    {
      selectedPropertyTypes: filters.selectedPropertyTypes,
      selectedPortfolios: filters.selectedPortfolios,
      selectedProperties: filters.selectedProperties,
      dateRange: filters.dateRange,
    }
  );
  
  const { 
    resolveConflictsAfterPortfolioChange,
    resolveConflictsAfterPropertyTypeChange, 
    resolveConflictsAfterPropertyChange 
  } = useFilterConflictResolution(
    {
      selectedPropertyTypes: filters.selectedPropertyTypes,
      selectedPortfolios: filters.selectedPortfolios,
      selectedProperties: filters.selectedProperties,
      dateRange: filters.dateRange,
    }, 
    updateFilter
  );
  
  const portfolioOptions = advancedOptions?.portfolioOptions || [];
  const propertyTypeOptions = advancedOptions?.propertyTypeOptions || [];
  const propertyOptions = advancedOptions?.propertyOptions || [];
  const showPortfolioFilter = portfolioId === "everything";

  // Enhanced change handlers with conflict resolution
  const handlePortfolioChange = (newPortfolios: string[]) => {
    onPortfoliosChange(newPortfolios);
    
    if (advancedOptions) {
      // Calculate what options will be available after this change
      const futureOptions = {
        portfolioOptions: advancedOptions.portfolioOptions,
        propertyTypeOptions: advancedOptions.propertyTypeOptions,
        propertyOptions: advancedOptions.propertyOptions.filter(p => {
          // Simulate filtering by new portfolio selection
          return newPortfolios.length === 0 || 
                 advancedOptions.portfolioOptions.some(portfolio => 
                   newPortfolios.includes(portfolio.value)
                 );
        })
      };
      
      resolveConflictsAfterPortfolioChange(newPortfolios, futureOptions);
    }
  };
  
  const handlePropertyTypeChange = (newPropertyTypes: string[]) => {
    onPropertyTypesChange(newPropertyTypes);
    
    if (advancedOptions) {
      resolveConflictsAfterPropertyTypeChange(newPropertyTypes, advancedOptions);
    }
  };
  
  const handlePropertyChange = (newProperties: string[]) => {
    onPropertiesChange(newProperties);
    
    if (advancedOptions) {
      resolveConflictsAfterPropertyChange(newProperties, advancedOptions);
    }
  };

  const activeFiltersCount = [
    showPortfolioFilter && filters.selectedPortfolios.length > 0,
    filters.selectedProperties.length > 0,
    filters.selectedPropertyTypes.length > 0,
  ].filter(Boolean).length;

  return (
    <CardEnhanced className="mb-6">
      <CardEnhancedContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-base">Tenant & Lease Analytics Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
            {isApplying && (
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Updating...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-sm h-8 px-3"
              >
                Clear All
                <X className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
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
                  options={portfolioOptions}
                  selected={filters.selectedPortfolios}
                  onChange={handlePortfolioChange}
                  placeholder={isLoadingOptions ? "Loading portfolios..." : 
                    portfolioOptions.length === 0 ? "No portfolios available" : 
                    `${portfolioOptions.length} portfolio${portfolioOptions.length === 1 ? '' : 's'} available`}
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
                options={propertyTypeOptions}
                selected={filters.selectedPropertyTypes}
                onChange={handlePropertyTypeChange}
                placeholder={isLoadingOptions ? "Loading types..." : 
                  propertyTypeOptions.length === 0 ? "No types match filters" : 
                  `${propertyTypeOptions.length} type${propertyTypeOptions.length === 1 ? '' : 's'} available`}
                className="h-9"
                showSearch={false}
              />
            </div>

            {/* Property Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Properties</label>
              </div>
              <MultiSelect
                options={propertyOptions}
                selected={filters.selectedProperties}
                onChange={handlePropertyChange}
                placeholder={isLoadingOptions ? "Loading properties..." :
                  propertyOptions.length === 0 ? "No properties match filters" :
                  `${propertyOptions.length} propert${propertyOptions.length === 1 ? 'y' : 'ies'} available`}
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
                onChange={onDateRangeChange}
                className="w-full"
              />
            </div>
          </div>

        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};