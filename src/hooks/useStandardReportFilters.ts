import { useState, useEffect } from 'react';
import { subDays, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { StandardReportFilters } from '@/components/ui/standard-report-filters';

interface UseStandardReportFiltersOptions {
  initialPortfolioId?: string;
  defaultDateRange?: 'month' | 'year' | 'custom';
  requireFilters?: boolean;
  validationMessage?: string;
  onValidationFail?: () => void;
}

interface UseStandardReportFiltersReturn {
  filters: StandardReportFilters;
  queryFilters: StandardReportFilters | null;
  isRunning: boolean;
  hasUserTriggeredRun: boolean;
  updateFilters: (updates: Partial<StandardReportFilters>) => void;
  runReport: () => void;
  hasValidFilters: () => boolean;
  resetToDefaults: () => void;
}

export const useStandardReportFilters = ({
  initialPortfolioId = 'everything',
  defaultDateRange = 'month',
  requireFilters = false,
  validationMessage = "Please select specific filters to run the report.",
  onValidationFail
}: UseStandardReportFiltersOptions = {}): UseStandardReportFiltersReturn => {
  
  const getDefaultDateRange = () => {
    const now = new Date();
    switch (defaultDateRange) {
      case 'year':
        return { from: startOfYear(now), to: now };
      case 'month':
        return { from: subDays(now, 30), to: now };
      default:
        return { from: subDays(now, 30), to: now };
    }
  };

  const defaultDates = getDefaultDateRange();

  const [filters, setFilters] = useState<StandardReportFilters>({
    portfolioId: initialPortfolioId,
    propertyIds: [],
    unitIds: [],
    assignedToIds: [],
    categories: [],
    statuses: [],
    dateFrom: defaultDates.from,
    dateTo: defaultDates.to,
    asOfDate: new Date()
  });

  const [queryFilters, setQueryFilters] = useState<StandardReportFilters | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasUserTriggeredRun, setHasUserTriggeredRun] = useState(false);

  const updateFilters = (updates: Partial<StandardReportFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const hasValidFilters = () => {
    if (!requireFilters) return true;
    
    const hasSpecificProperties = filters.propertyIds.length > 0 || filters.unitIds.length > 0;
    const hasSpecificVendors = filters.assignedToIds && filters.assignedToIds.length > 0;
    const hasSpecificCategories = filters.categories && filters.categories.length > 0;
    const hasSpecificStatuses = filters.statuses && filters.statuses.length > 0;
    
    return hasSpecificProperties || hasSpecificVendors || hasSpecificCategories || hasSpecificStatuses;
  };

  const runReport = () => {
    if (requireFilters && !hasValidFilters()) {
      toast.error(validationMessage);
      onValidationFail?.();
      return;
    }

    setIsRunning(true);
    setQueryFilters(filters);
    setHasUserTriggeredRun(true);
    setTimeout(() => setIsRunning(false), 1000);
  };

  const resetToDefaults = () => {
    const newDefaultDates = getDefaultDateRange();
    setFilters({
      portfolioId: initialPortfolioId,
      propertyIds: [],
      unitIds: [],
      assignedToIds: [],
      categories: [],
      statuses: [],
      dateFrom: newDefaultDates.from,
      dateTo: newDefaultDates.to,
      asOfDate: new Date()
    });
    setQueryFilters(null);
    setHasUserTriggeredRun(false);
  };

  // Reset filters when portfolio changes
  useEffect(() => {
    const newDefaultDates = getDefaultDateRange();
    setFilters(prev => ({
      ...prev,
      propertyIds: [],
      unitIds: [],
      assignedToIds: [],
      categories: [],
      statuses: [],
      dateFrom: newDefaultDates.from,
      dateTo: newDefaultDates.to
    }));
  }, [filters.portfolioId]);

  return {
    filters,
    queryFilters,
    isRunning,
    hasUserTriggeredRun,
    updateFilters,
    runReport,
    hasValidFilters,
    resetToDefaults
  };
};