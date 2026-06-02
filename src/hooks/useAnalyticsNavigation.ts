import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export const useAnalyticsNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get('analyticsTab') || 'custom-overview';
  const currentSubtab = searchParams.get('subtab');
  const portfolioId = searchParams.get('portfolioId');

  const updateTab = useCallback((tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('analyticsTab', tab);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const navigateToAssets = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('analyticsTab', 'assets');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const navigateToAnalytics = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('analyticsTab', 'analytics');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const navigateToTenantAnalytics = useCallback(() => {
    // Dispatch custom event to trigger tenant analytics view
    window.dispatchEvent(new CustomEvent('open-tenant-analytics'));
  }, []);

  const navigateToOperationalPerformance = useCallback(() => {
    // Dispatch custom event to trigger operational performance view
    window.dispatchEvent(new CustomEvent('open-operational-performance'));
  }, []);

  const navigateToFinancialPerformance = useCallback(() => {
    // Dispatch custom event to trigger financial performance view
    window.dispatchEvent(new CustomEvent('open-financial-performance'));
  }, []);

  const navigateToPredictiveAnalytics = useCallback(() => {
    // Dispatch custom event to trigger predictive analytics view
    window.dispatchEvent(new CustomEvent('open-predictive-analytics'));
  }, []);

  return {
    currentTab,
    currentSubtab,
    portfolioId,
    updateTab,
    navigateToAssets,
    navigateToAnalytics,
    navigateToTenantAnalytics,
    navigateToOperationalPerformance,
    navigateToFinancialPerformance,
    navigateToPredictiveAnalytics
  };
};