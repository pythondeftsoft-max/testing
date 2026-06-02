import { useState, useCallback, useMemo } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface TenantFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  selectedProperties: string[];
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedTenantCategories: {
    tenantLifecycle: boolean;
    leaseManagement: boolean;
    tenantSatisfaction: boolean;
    rentOptimization: boolean;
  };
}

const getDefaultDateRange = () => ({
  from: subMonths(startOfMonth(new Date()), 11),
  to: new Date(),
});

const getDefaultTenantCategories = () => ({
  tenantLifecycle: true,
  leaseManagement: true,
  tenantSatisfaction: true,
  rentOptimization: true,
});

export const useTenantFilters = () => {
  const [pendingFilters, setPendingFilters] = useState<TenantFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedTenantCategories: getDefaultTenantCategories(),
  });

  const [appliedFilters, setAppliedFilters] = useState<TenantFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedTenantCategories: getDefaultTenantCategories(),
  });

  const [isApplying, setIsApplying] = useState(false);

  const updatePendingFilter = useCallback(<K extends keyof TenantFilters>(
    key: K,
    value: TenantFilters[K]
  ) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePendingCategory = useCallback((category: keyof TenantFilters['selectedTenantCategories'], value: boolean) => {
    setPendingFilters(prev => ({
      ...prev,
      selectedTenantCategories: {
        ...prev.selectedTenantCategories,
        [category]: value,
      },
    }));
  }, []);

  const applyPendingFilters = useCallback(async () => {
    setIsApplying(true);
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
      selectedTenantCategories: getDefaultTenantCategories(),
    };
    setPendingFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const hasActivePendingFilters = useMemo(() => {
    const defaultCategories = getDefaultTenantCategories();
    const hasNonDefaultCategories = Object.keys(pendingFilters.selectedTenantCategories).some(
      key => pendingFilters.selectedTenantCategories[key as keyof typeof pendingFilters.selectedTenantCategories] !== 
            defaultCategories[key as keyof typeof defaultCategories]
    );
    
    return (
      pendingFilters.selectedProperties.length > 0 ||
      pendingFilters.selectedPropertyTypes.length > 0 ||
      pendingFilters.selectedPortfolios.length > 0 ||
      hasNonDefaultCategories
    );
  }, [pendingFilters]);

  const hasActiveAppliedFilters = useMemo(() => {
    const defaultCategories = getDefaultTenantCategories();
    const hasNonDefaultCategories = Object.keys(appliedFilters.selectedTenantCategories).some(
      key => appliedFilters.selectedTenantCategories[key as keyof typeof appliedFilters.selectedTenantCategories] !== 
            defaultCategories[key as keyof typeof defaultCategories]
    );
    
    return (
      appliedFilters.selectedProperties.length > 0 ||
      appliedFilters.selectedPropertyTypes.length > 0 ||
      appliedFilters.selectedPortfolios.length > 0 ||
      hasNonDefaultCategories
    );
  }, [appliedFilters]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
  }, [pendingFilters, appliedFilters]);

  const getFormattedFilters = useMemo(() => ({
    startDate: appliedFilters.dateRange.from ? format(appliedFilters.dateRange.from, 'yyyy-MM-dd') : '',
    endDate: appliedFilters.dateRange.to ? format(appliedFilters.dateRange.to, 'yyyy-MM-dd') : '',
    propertyIds: appliedFilters.selectedProperties,
    propertyTypes: appliedFilters.selectedPropertyTypes,
    portfolioIds: appliedFilters.selectedPortfolios,
    tenantCategories: appliedFilters.selectedTenantCategories,
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