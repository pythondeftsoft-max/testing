import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface NavigateToAssetsOptions {
  assetSymbol?: string;
  assetCategory?: string;
  currency?: SupportedCurrency;
  portfolioId?: string;
  highlightAssetId?: string;
  openAssetWizard?: boolean;
}

export const useAssetNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const navigateToAssets = useCallback((options: NavigateToAssetsOptions = {}) => {
    const params = new URLSearchParams(searchParams);
    
    // Always set tab to assets
    params.set('tab', 'assets');
    
    // Add optional parameters
    if (options.assetSymbol) {
      params.set('assetSymbol', options.assetSymbol);
    }
    
    if (options.assetCategory) {
      params.set('assetCategory', options.assetCategory);
    }
    
    if (options.currency) {
      params.set('currency', options.currency);
    }
    
    if (options.portfolioId) {
      params.set('portfolioId', options.portfolioId);
    }
    
    if (options.highlightAssetId) {
      params.set('highlightAssetId', options.highlightAssetId);
    }
    
    if (options.openAssetWizard) {
      params.set('openAssetWizard', '1');
    }

    // Update URL
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    
    // If we're already on the same page, just update params
    if (window.location.pathname === '/dashboard') {
      setSearchParams(params);
    } else {
      // Navigate to dashboard with assets tab
      window.location.href = newUrl;
    }
    
    // Scroll to assets grid after navigation
    setTimeout(() => {
      const assetsGrid = document.getElementById('assets-grid') || document.querySelector('[data-assets-grid]');
      if (assetsGrid) {
        assetsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [searchParams, setSearchParams]);

  const navigateToHoldings = useCallback((options: { portfolioId?: string; currency?: SupportedCurrency } = {}) => {
    const params = new URLSearchParams();
    
    if (options.portfolioId) {
      params.set('portfolioId', options.portfolioId);
    }
    
    if (options.currency) {
      params.set('currency', options.currency);
    }

    const holdingsUrl = `/holdings${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = holdingsUrl;
  }, []);

  const getCurrentCurrency = useCallback((): SupportedCurrency => {
    return (localStorage.getItem('preferred-currency') as SupportedCurrency) || 'USD';
  }, []);

  return {
    navigateToAssets,
    navigateToHoldings,
    getCurrentCurrency
  };
};