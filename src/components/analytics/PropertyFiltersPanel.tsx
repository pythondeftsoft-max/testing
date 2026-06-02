import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Filter, Play, Loader2, Calendar, Building2, Tags, FolderOpen, ChevronDown } from 'lucide-react';
import { useAdvancedFilterOptions } from '@/hooks/useAdvancedFilterOptions';
import { useFilterConflictResolution } from '@/hooks/useFilterConflictResolution';

interface PropertyFiltersProps {
  title?: string;
  selectedPropertyTypes: string[];
  onPropertyTypeChange: (types: string[]) => void;
  selectedPortfolios: string[];
  onPortfoliosChange: (portfolios: string[]) => void;
  selectedProperties: string[];
  onPropertiesChange: (properties: string[]) => void;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onDateRangeChange: (dateRange: { from: Date | undefined; to: Date | undefined }) => void;
  
  // Filter state and updater function for conflict resolution
  filters: {
    selectedPropertyTypes: string[];
    selectedPortfolios: string[];
    selectedProperties: string[];
    dateRange: {
      from: Date | undefined;
      to: Date | undefined;
    };
  };
  updateFilter: <K extends keyof PropertyFiltersProps['filters']>(key: K, value: PropertyFiltersProps['filters'][K]) => void;
  
  onClearFilters: () => void;
  isApplying: boolean;
  userId: string;
  portfolioId?: string;
  
  // Smart default detection props
  isDateRangeDefault?: boolean;
  defaultPortfolios?: string[];
}

const PropertyFiltersPanel = ({
  title = "Property Filters",
  selectedPropertyTypes,
  onPropertyTypeChange,
  selectedPortfolios,
  onPortfoliosChange,
  selectedProperties,
  onPropertiesChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  isApplying,
  userId,
  portfolioId,
  filters,
  updateFilter,
  isDateRangeDefault = false,
  defaultPortfolios = [],
}: PropertyFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  
  // Debug property filter data flow
  console.log('🔍 [PropertyFiltersPanel] Component data:', {
    userId,
    portfolioId,
    isApplying,
    selectedPropertyTypesCount: selectedPropertyTypes.length,
    selectedPortfoliosCount: selectedPortfolios.length,
    selectedPropertiesCount: selectedProperties.length,
    hasDateRange: !!(dateRange.from && dateRange.to)
  });

  // Use dynamic cascading filter options
  const { data: advancedOptions, isLoading: isLoadingOptions } = useAdvancedFilterOptions(
    userId, 
    portfolioId, 
    filters
  );
  
  const { 
    resolveConflictsAfterPortfolioChange,
    resolveConflictsAfterPropertyTypeChange, 
    resolveConflictsAfterPropertyChange 
  } = useFilterConflictResolution(filters, updateFilter);
  
  const portfolioOptions = advancedOptions?.portfolioOptions || [];
  const propertyTypeOptions = advancedOptions?.propertyTypeOptions || [];
  const propertyOptions = advancedOptions?.propertyOptions || [];
  const showPortfolioFilter = portfolioId === "everything";

  console.log('🔍 [PropertyFiltersPanel] Dynamic filter options:', {
    propertyTypeOptionsCount: propertyTypeOptions.length,
    portfolioOptionsCount: portfolioOptions.length,
    propertiesCount: propertyOptions.length,
    isLoadingOptions,
    showPortfolioFilter,
    currentFilters: filters
  });
  
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
    onPropertyTypeChange(newPropertyTypes);
    
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

  // Helper to check if arrays are equal
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  const activeFiltersCount = [
    // Property Types: active if not empty (default is empty = all)
    selectedPropertyTypes.length > 0,
    // Portfolios: active if different from default
    showPortfolioFilter && !arraysEqual(selectedPortfolios, defaultPortfolios),
    // Properties: active if not empty (default is empty = all)
    selectedProperties.length > 0,
    // Date Range: active if set AND not YTD (YTD is the default)
    !!(dateRange.from && dateRange.to) && !isDateRangeDefault,
  ].filter(Boolean).length;


  return (
    <CardEnhanced className="mb-6">
      <CardEnhancedContent className="p-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Clickable Header */}
          <CollapsibleTrigger asChild>
            <div className={`flex items-center justify-between cursor-pointer group hover:opacity-80 transition-opacity ${
              isOpen ? 'mb-6' : 'mb-2'
            }`}>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-base">{title}</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFiltersCount} active
                  </Badge>
                )}
                <ChevronDown 
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {isApplying && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </div>
                )}
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
          </CollapsibleTrigger>

          {/* Collapsible Filter Controls */}
          <CollapsibleContent className="animate-in slide-in-from-top-1 duration-200">
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
                  selected={selectedPortfolios}
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
                selected={selectedPropertyTypes}
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
                selected={selectedProperties}
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
                value={dateRange}
                onChange={onDateRangeChange}
                className="w-full"
              />
            </div>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default PropertyFiltersPanel;