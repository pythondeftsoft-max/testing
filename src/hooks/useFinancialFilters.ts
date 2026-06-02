import { useState, useCallback, useMemo } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface FinancialFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  selectedProperties: string[];
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedTenantTypes: string[];
  selectedCategories: {
    rent: boolean;
    fees: boolean;
    maintenance: boolean;
    insurance: boolean;
    taxes: boolean;
    management: boolean;
    other: boolean;
  };
}

const getDefaultDateRange = () => ({
  from: subMonths(startOfMonth(new Date()), 11),
  to: new Date(),
});

const getDefaultCategories = () => ({
  rent: true,
  fees: true,
  maintenance: true,
  insurance: true,
  taxes: true,
  management: true,
  other: true,
});

export const useFinancialFilters = () => {
  const [pendingFilters, setPendingFilters] = useState<FinancialFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedTenantTypes: [],
    selectedCategories: getDefaultCategories(),
  });

  const [appliedFilters, setAppliedFilters] = useState<FinancialFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedTenantTypes: [],
    selectedCategories: getDefaultCategories(),
  });

  const [isApplying, setIsApplying] = useState(false);

  const updatePendingFilter = useCallback(<K extends keyof FinancialFilters>(
    key: K,
    value: FinancialFilters[K]
  ) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePendingCategory = useCallback((category: keyof FinancialFilters['selectedCategories'], value: boolean) => {
    setPendingFilters(prev => ({
      ...prev,
      selectedCategories: {
        ...prev.selectedCategories,
        [category]: value,
      },
    }));
  }, []);

  const applyPendingFilters = useCallback(async () => {
    setIsApplying(true);
    // Simulate brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    setAppliedFilters(pendingFilters);
    setIsApplying(false);
  }, [pendingFilters]);

  const clearFilters = useCallback(() => {
    const defaultFilters = {
      dateRange: getDefaultDateRange(),
      selectedProperties: [],
      selectedPropertyTypes: [],
      selectedPortfolios: [],
      selectedTenantTypes: [],
      selectedCategories: getDefaultCategories(),
    };
    setPendingFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const hasActivePendingFilters = useMemo(() => {
    const defaultCategories = getDefaultCategories();
    const hasNonDefaultCategories = Object.keys(pendingFilters.selectedCategories).some(
      key => pendingFilters.selectedCategories[key as keyof typeof pendingFilters.selectedCategories] !== 
            defaultCategories[key as keyof typeof defaultCategories]
    );
    
    return (
      pendingFilters.selectedProperties.length > 0 ||
      pendingFilters.selectedPropertyTypes.length > 0 ||
      pendingFilters.selectedPortfolios.length > 0 ||
      pendingFilters.selectedTenantTypes.length > 0 ||
      hasNonDefaultCategories
    );
  }, [pendingFilters]);

  const hasActiveAppliedFilters = useMemo(() => {
    const defaultCategories = getDefaultCategories();
    const hasNonDefaultCategories = Object.keys(appliedFilters.selectedCategories).some(
      key => appliedFilters.selectedCategories[key as keyof typeof appliedFilters.selectedCategories] !== 
            defaultCategories[key as keyof typeof defaultCategories]
    );
    
    return (
      appliedFilters.selectedProperties.length > 0 ||
      appliedFilters.selectedPropertyTypes.length > 0 ||
      appliedFilters.selectedPortfolios.length > 0 ||
      appliedFilters.selectedTenantTypes.length > 0 ||
      hasNonDefaultCategories
    );
  }, [appliedFilters]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
  }, [pendingFilters, appliedFilters]);

  // Format filters for API consumption
  const getFormattedFilters = useMemo(() => ({
    startDate: appliedFilters.dateRange.from ? format(appliedFilters.dateRange.from, 'yyyy-MM-dd') : '',
    endDate: appliedFilters.dateRange.to ? format(appliedFilters.dateRange.to, 'yyyy-MM-dd') : '',
    propertyIds: appliedFilters.selectedProperties,
    propertyTypes: appliedFilters.selectedPropertyTypes,
    portfolioIds: appliedFilters.selectedPortfolios,
    tenantTypes: appliedFilters.selectedTenantTypes,
    categories: appliedFilters.selectedCategories,
  }), [appliedFilters]);

  return {
    pendingFilters,
    appliedFilters,
    updatePendingFilter,
    updatePendingCategory,
    applyPendingFilters,
    clearFilters,
    hasActivePendingFilters,
    hasActiveAppliedFilters,
    hasChanges,
    isApplying,
    getFormattedFilters,
  };
};