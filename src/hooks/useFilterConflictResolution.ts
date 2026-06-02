import { useCallback } from 'react';

interface PropertyFilters {
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedProperties: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface FinancialPropertyFilters extends PropertyFilters {
  selectedTenantTypes: string[];
}

interface FilterOptions {
  portfolioOptions: { value: string; label: string }[];
  propertyTypeOptions: { value: string; label: string }[];
  propertyOptions: { value: string; label: string }[];
}

export const useFilterConflictResolution = (
  filters: PropertyFilters | FinancialPropertyFilters,
  updateFilter: <K extends keyof (PropertyFilters | FinancialPropertyFilters)>(key: K, value: any) => void
) => {
  
  const resolveConflictsAfterPortfolioChange = useCallback((
    newPortfolios: string[],
    availableOptions: FilterOptions
  ) => {
    const availablePropertyIds = new Set(availableOptions.propertyOptions.map(p => p.value));
    const availablePropertyTypes = new Set(availableOptions.propertyTypeOptions.map(p => p.value));
    
    // Clear properties that don't exist in the new portfolio selection
    const validProperties = filters.selectedProperties.filter(id => 
      availablePropertyIds.has(id)
    );
    
    // Clear property types that don't exist in the new portfolio selection
    const validPropertyTypes = filters.selectedPropertyTypes.filter(type =>
      availablePropertyTypes.has(type)
    );
    
    // Update filters if any conflicts were found
    if (validProperties.length !== filters.selectedProperties.length) {
      updateFilter('selectedProperties', validProperties);
    }
    
    if (validPropertyTypes.length !== filters.selectedPropertyTypes.length) {
      updateFilter('selectedPropertyTypes', validPropertyTypes);
    }
    
    return {
      propertiesCleared: filters.selectedProperties.length - validProperties.length,
      propertyTypesCleared: filters.selectedPropertyTypes.length - validPropertyTypes.length
    };
  }, [filters, updateFilter]);

  const resolveConflictsAfterPropertyTypeChange = useCallback((
    newPropertyTypes: string[],
    availableOptions: FilterOptions
  ) => {
    const availablePropertyIds = new Set(availableOptions.propertyOptions.map(p => p.value));
    const availablePortfolioIds = new Set(availableOptions.portfolioOptions.map(p => p.value));
    
    // Clear properties that don't match the new property type selection
    const validProperties = filters.selectedProperties.filter(id => 
      availablePropertyIds.has(id)
    );
    
    // Clear portfolios that don't contain the new property types
    const validPortfolios = filters.selectedPortfolios.filter(id =>
      availablePortfolioIds.has(id)
    );
    
    // Update filters if any conflicts were found
    if (validProperties.length !== filters.selectedProperties.length) {
      updateFilter('selectedProperties', validProperties);
    }
    
    if (validPortfolios.length !== filters.selectedPortfolios.length) {
      updateFilter('selectedPortfolios', validPortfolios);
    }
    
    return {
      propertiesCleared: filters.selectedProperties.length - validProperties.length,
      portfoliosCleared: filters.selectedPortfolios.length - validPortfolios.length
    };
  }, [filters, updateFilter]);

  const resolveConflictsAfterPropertyChange = useCallback((
    newProperties: string[],
    availableOptions: FilterOptions
  ) => {
    const availablePortfolioIds = new Set(availableOptions.portfolioOptions.map(p => p.value));
    const availablePropertyTypes = new Set(availableOptions.propertyTypeOptions.map(p => p.value));
    
    // Clear portfolios that don't contain the selected properties
    const validPortfolios = filters.selectedPortfolios.filter(id =>
      availablePortfolioIds.has(id)
    );
    
    // Clear property types that don't match the selected properties
    const validPropertyTypes = filters.selectedPropertyTypes.filter(type =>
      availablePropertyTypes.has(type)
    );
    
    // Update filters if any conflicts were found
    if (validPortfolios.length !== filters.selectedPortfolios.length) {
      updateFilter('selectedPortfolios', validPortfolios);
    }
    
    if (validPropertyTypes.length !== filters.selectedPropertyTypes.length) {
      updateFilter('selectedPropertyTypes', validPropertyTypes);
    }
    
    return {
      portfoliosCleared: filters.selectedPortfolios.length - validPortfolios.length,
      propertyTypesCleared: filters.selectedPropertyTypes.length - validPropertyTypes.length
    };
  }, [filters, updateFilter]);

  return {
    resolveConflictsAfterPortfolioChange,
    resolveConflictsAfterPropertyTypeChange,
    resolveConflictsAfterPropertyChange,
  };
};