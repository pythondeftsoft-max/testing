import { useState, useCallback, useMemo } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface OperationalFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  selectedProperties: string[];
  selectedPropertyTypes: string[];
  selectedPortfolios: string[];
  selectedOperationalCategories: {
    leasingTenant: boolean;
    maintenanceVendor: boolean;
    riskCompliance: boolean;
  };
}

const getDefaultDateRange = () => ({
  from: subMonths(startOfMonth(new Date()), 11),
  to: new Date(),
});

const getDefaultOperationalCategories = () => ({
  leasingTenant: true,
  maintenanceVendor: true,
  riskCompliance: true,
});

export const useOperationalFilters = () => {
  const [pendingFilters, setPendingFilters] = useState<OperationalFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedOperationalCategories: getDefaultOperationalCategories(),
  });

  const [appliedFilters, setAppliedFilters] = useState<OperationalFilters>({
    dateRange: getDefaultDateRange(),
    selectedProperties: [],
    selectedPropertyTypes: [],
    selectedPortfolios: [],
    selectedOperationalCategories: getDefaultOperationalCategories(),
  });

  const [isApplying, setIsApplying] = useState(false);

  const updatePendingFilter = useCallback(<K extends keyof OperationalFilters>(
    key: K,
    value: OperationalFilters[K]
  ) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePendingCategory = useCallback((category: keyof OperationalFilters['selectedOperationalCategories'], value: boolean) => {
    setPendingFilters(prev => ({
      ...prev,
      selectedOperationalCategories: {
        ...prev.selectedOperationalCategories,
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
      selectedOperationalCategories: getDefaultOperationalCategories(),
    };
    setPendingFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const hasActivePendingFilters = useMemo(() => {
    const defaultCategories = getDefaultOperationalCategories();
    const hasNonDefaultCategories = Object.keys(pendingFilters.selectedOperationalCategories).some(
      key => pendingFilters.selectedOperationalCategories[key as keyof typeof pendingFilters.selectedOperationalCategories] !== 
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
    const defaultCategories = getDefaultOperationalCategories();
    const hasNonDefaultCategories = Object.keys(appliedFilters.selectedOperationalCategories).some(
      key => appliedFilters.selectedOperationalCategories[key as keyof typeof appliedFilters.selectedOperationalCategories] !== 
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
    operationalCategories: appliedFilters.selectedOperationalCategories,
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