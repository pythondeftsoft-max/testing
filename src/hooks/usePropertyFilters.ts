import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface PropertyFilters {
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedProperties: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export const usePropertyFilters = () => {
  const [filters, setFilters] = useState<PropertyFilters>({
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedProperties: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
  });

  const [isApplying, setIsApplying] = useState(false);

  // Debounce filter changes to avoid too many API calls
  const debouncedFilters = useDebounce(filters, 300);

  const updateFilter = useCallback(<K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K]
  ) => {
    setIsApplying(true);
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Brief loading state for better UX
    setTimeout(() => setIsApplying(false), 200);
  }, []);

  const clearFilters = useCallback(() => {
    const defaultFilters = {
      selectedPropertyTypes: [],
      selectedPortfolios: [],
      selectedProperties: [],
      dateRange: {
        from: undefined,
        to: undefined,
      },
    };
    setIsApplying(true);
    setFilters(defaultFilters);
    setTimeout(() => setIsApplying(false), 200);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedFilters.selectedPropertyTypes.length > 0 ||
      debouncedFilters.selectedPortfolios.length > 0 ||
      debouncedFilters.selectedProperties.length > 0 ||
      (debouncedFilters.dateRange.from !== undefined && debouncedFilters.dateRange.to !== undefined)
    );
  }, [debouncedFilters]);

  const applyFilters = useCallback(<T extends {
    id: string;
    address?: string;
    status?: string;
    monthly_rent?: number;
    bedrooms?: number;
    property_type?: string;
  }>(properties: T[]): T[] => {
    const filtersToUse = debouncedFilters;
    
    console.log('🔍 Applying auto filters to properties:', {
      totalProperties: properties.length,
      appliedFilters: filtersToUse,
      hasSelectedPropertyTypes: filtersToUse.selectedPropertyTypes.length > 0,
      propertiesPreview: properties.slice(0, 3).map(p => ({ id: p.id, address: p.address, property_type: p.property_type }))
    });

    const filtered = properties.filter(property => {
      // If specific property types selected, filter by property type
      if (filtersToUse.selectedPropertyTypes.length > 0) {
        if (!filtersToUse.selectedPropertyTypes.includes(property.property_type || '')) {
          console.log('🚫 Property filtered out by type:', property.id, property.property_type);
          return false;
        }
      }

      return true;
    });

    console.log('✅ Filter results:', {
      originalCount: properties.length,
      filteredCount: filtered.length,
      filteredIds: filtered.map(p => p.id).slice(0, 5)
    });

    return filtered;
  }, [debouncedFilters]);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    isApplying,
    applyFilters,
  };
};