import React from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { X, Filter, Loader2, Calendar, Building2, Tags, FolderOpen, Users } from 'lucide-react';
import { useAdvancedFilterOptions } from '@/hooks/useAdvancedFilterOptions';
import { useFilterConflictResolution } from '@/hooks/useFilterConflictResolution';
import { FinancialFilters } from '@/hooks/useFinancialFilters';

// Import the FinancialPropertyFilters type from useAdvancedFilterOptions
type FinancialPropertyFilters = {
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedProperties: string[];
  selectedTenantTypes: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
};

interface FinancialFiltersPanelProps {
  filters: FinancialFilters;
  onDateRangeChange: (dateRange: { from: Date | undefined; to: Date | undefined }) => void;
  onPropertiesChange: (properties: string[]) => void;
  onPropertyTypesChange: (types: string[]) => void;
  onPortfoliosChange: (portfolios: string[]) => void;
  onTenantTypesChange: (tenantTypes: string[]) => void;
  onCategoryChange: (category: keyof FinancialFilters['selectedCategories'], value: boolean) => void;
  onClearFilters: () => void;
  isApplying: boolean;
  userId: string;
  portfolioId?: string;
  // Add updateFilter for conflict resolution
  updateFilter: <K extends keyof Pick<FinancialFilters, 'selectedProperties' | 'selectedPropertyTypes' | 'selectedPortfolios' | 'selectedTenantTypes' | 'dateRange'>>(
    key: K, 
    value: FinancialFilters[K]
  ) => void;
}

const FinancialFiltersPanel: React.FC<FinancialFiltersPanelProps> = ({
  filters,
  onDateRangeChange,
  onPropertiesChange,
  onPropertyTypesChange,
  onPortfoliosChange,
  onTenantTypesChange,
  onCategoryChange,
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
      selectedTenantTypes: filters.selectedTenantTypes,
      dateRange: filters.dateRange,
    } as FinancialPropertyFilters
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
      selectedTenantTypes: filters.selectedTenantTypes,
      dateRange: filters.dateRange,
    } as FinancialPropertyFilters, 
    updateFilter
  );
  
  const portfolioOptions = advancedOptions?.portfolioOptions || [];
  const propertyTypeOptions = advancedOptions?.propertyTypeOptions || [];
  const propertyOptions = advancedOptions?.propertyOptions || [];
  const tenantTypeOptions = advancedOptions?.tenantTypeOptions || [];
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

  const categoryLabels: Record<keyof FinancialFilters['selectedCategories'], string> = {
    rent: 'Rent Revenue',
    fees: 'Fees & Other Income',
    maintenance: 'Maintenance',
    insurance: 'Insurance',
    taxes: 'Property Taxes',
    management: 'Management Fees',
    other: 'Other Expenses',
  };

  const activeFiltersCount = [
    showPortfolioFilter && filters.selectedPortfolios.length > 0,
    filters.selectedProperties.length > 0,
    filters.selectedPropertyTypes.length > 0,
    filters.selectedTenantTypes.length > 0,
  ].filter(Boolean).length;


  return (
    <CardEnhanced className="mb-6">
      <CardEnhancedContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-base">Financial Performance Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
            {isApplying && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Updating...</span>
              </div>
            )}
          </div>
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

        <div className="space-y-6">
          {/* Property and Portfolio Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Tenant Type Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Tenant Types</label>
              </div>
              <MultiSelect
                options={tenantTypeOptions}
                selected={filters.selectedTenantTypes}
                onChange={onTenantTypesChange}
                placeholder={isLoadingOptions ? "Loading tenant types..." : 
                  tenantTypeOptions.length === 0 ? "No tenant types available" : 
                  `${tenantTypeOptions.length} tenant type${tenantTypeOptions.length === 1 ? '' : 's'} available`}
                className="h-9"
              />
            </div>

          </div>

          {/* Second Row - Properties and Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

export default FinancialFiltersPanel;