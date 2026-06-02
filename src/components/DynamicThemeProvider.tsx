
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWhiteLabelBySubdomain, useWhiteLabelByDomain, WhiteLabelConfig } from '@/hooks/useWhiteLabel';
import { ThemeLoadingSkeleton } from './WhiteLabelLoadingStates';
import { analyticsTracker } from '@/lib/whitelabel-analytics';

interface ThemeContextType {
  whiteLabelConfig: WhiteLabelConfig | null;
  isWhiteLabeled: boolean;
  isApplyingTheme: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  themeError: string | null;
  applyTheme: (config: WhiteLabelConfig) => void;
  resetTheme: () => void;
  clearThemeError: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a DynamicThemeProvider');
  }
  return context;
};

interface DynamicThemeProviderProps {
  children: React.ReactNode;
}

export const DynamicThemeProvider = ({ children }: DynamicThemeProviderProps) => {
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<WhiteLabelConfig | null>(null);
  const [isWhiteLabeled, setIsWhiteLabeled] = useState(false);
  const [isApplyingTheme, setIsApplyingTheme] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Extract subdomain and domain from current URL
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Skip verbose logging in production
  
  // Handle different domain scenarios
  let subdomain = '';
  let customDomain = '';
  let useSubdomainLookup = false;
  let useCustomDomainLookup = false;
  
  // Skip white-label lookup entirely for known internal domains
  const isInternalDomain = isLocalhost || 
    hostname.includes('lovable.app') || 
    hostname.includes('lovableproject.com') ||
    hostname === 'openkeyhousing.com' || 
    hostname === 'www.openkeyhousing.com' ||
    hostname === 'openkey-housing-hub.lovable.app';

  if (!isLocalhost && !isInternalDomain) {
    const parts = hostname.split('.');
    
    // Check if this is a subdomain of openkeyhousing.com
    const isOpenKeySubdomain = hostname.includes('openkeyhousing.com') && parts.length >= 3;
    
    if (isOpenKeySubdomain) {
      subdomain = parts[0] === 'www' ? '' : parts[0];
      useSubdomainLookup = true;
    } else if (parts.length >= 2) {
      // This is a custom domain like customdomain.com
      customDomain = hostname;
      useCustomDomainLookup = true;
    }
  }

  // Only use one lookup method to prevent conflicts
  const { data: subdomainConfig, isLoading: subdomainLoading } = useWhiteLabelBySubdomain(useSubdomainLookup ? subdomain : '');
  const { data: domainConfig, isLoading: domainLoading } = useWhiteLabelByDomain(useCustomDomainLookup ? customDomain : '');

  // Track loading state
  const isLookupLoading = useSubdomainLookup ? subdomainLoading : (useCustomDomainLookup ? domainLoading : false);

  // Apply theme configuration to CSS custom properties
  const applyTheme = (config: WhiteLabelConfig) => {
    if (!config) return;
    
    setIsApplyingTheme(true);
    setThemeError(null);

    try {
      const root = document.documentElement;
    
    // Apply color scheme based on theme preset or custom colors
    if (config.theme_preset && config.theme_preset !== 'custom') {
      applyThemePreset(config.theme_preset, root);
    } else {
      // Apply custom colors
      if (config.primary_color) {
        const hsl = hexToHsl(config.primary_color);
        root.style.setProperty('--primary', hsl);
      }
      
      if (config.secondary_color) {
        const hsl = hexToHsl(config.secondary_color);
        root.style.setProperty('--secondary', hsl);
      }
      
      if (config.accent_color) {
        const hsl = hexToHsl(config.accent_color);
        root.style.setProperty('--accent', hsl);
      }
    }

    // Apply company branding
    if (config.company_name) {
      root.style.setProperty('--company-name', `"${config.company_name}"`);
    }

    // Update favicon if provided
    if (config.favicon_url) {
      updateFavicon(config.favicon_url);
    }

    // Update page title if company name is provided
    if (config.company_name) {
      document.title = `${config.company_name} - Property Management`;
    }

    // Apply landing page customizations if configured
    if (config.landing_page_config) {
      applyLandingPageCustomizations(config.landing_page_config, root);
    }

      setWhiteLabelConfig(config);
      setIsWhiteLabeled(true);
    } catch (error) {
      console.error('Error applying theme:', error);
      setThemeError('Failed to apply theme configuration');
    } finally {
      setIsApplyingTheme(false);
    }
  };

  // Reset theme to default values
  const resetTheme = () => {
    const root = document.documentElement;
    
    // Reset to default colors
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--company-name');
    
    // Reset title
    document.title = 'OpenKey - Affordable Housing & Property Management';
    
    // Reset favicon to default
    updateFavicon('/favicon.png');
    
    setWhiteLabelConfig(null);
    setIsWhiteLabeled(false);
  };

  // Apply white label config when available
  useEffect(() => {
    console.log('[DynamicThemeProvider] useEffect - isLookupLoading:', isLookupLoading, 'isInitialized:', isInitialized);
    
    setIsLoading(isLookupLoading);
    
    if (!isLookupLoading) {
      const config = subdomainConfig || domainConfig;
      
      console.log('[DynamicThemeProvider] Config loaded:', config);
      
      if (config) {
        applyTheme(config);
        // Initialize analytics tracking for white-labeled sites
        analyticsTracker.initialize(config.id);
      } else {
        resetTheme();
      }
      
      if (!isInitialized) {
        setIsInitialized(true);
        console.log('[DynamicThemeProvider] Theme initialized');
      }
    }
  }, [subdomainConfig, domainConfig, isLookupLoading, isInitialized]);

  // Track route changes for analytics
  useEffect(() => {
    if (isWhiteLabeled && whiteLabelConfig) {
      const handleRouteChange = () => {
        analyticsTracker.trackPageView();
      };

      // Track initial page view
      handleRouteChange();

      // Listen for route changes (works with React Router)
      window.addEventListener('popstate', handleRouteChange);
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [isWhiteLabeled, whiteLabelConfig]);

  // Clear theme error
  const clearThemeError = () => {
    setThemeError(null);
  };

  const value: ThemeContextType = {
    whiteLabelConfig,
    isWhiteLabeled,
    isApplyingTheme,
    isInitialized,
    isLoading,
    themeError,
    applyTheme,
    resetTheme,
    clearThemeError,
  };

  // Add timeout effect to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.warn('[DynamicThemeProvider] Initialization timed out, proceeding with default theme');
        setHasTimedOut(true);
        setIsInitialized(true);
        setIsLoading(false);
        resetTheme();
      }
    }, 5000); // 5 seconds - reduced from 10 for faster fallback

    return () => clearTimeout(timeoutId);
  }, [isInitialized]);

  // Don't block on theme initialization - render children immediately after timeout
  // This ensures the auth form always loads even if theme lookup fails
  if (!isInitialized && !hasTimedOut) {
    console.log('[DynamicThemeProvider] Waiting for theme initialization...', { isInitialized, isLoading, hasTimedOut });
    return <ThemeLoadingSkeleton />;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Utility function to convert hex to HSL
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Convert to HSL string format for CSS
  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);
  
  return `${hue} ${saturation}% ${lightness}%`;
}

// Apply theme preset colors
function applyThemePreset(preset: string, root: HTMLElement) {
  const presets = {
    modern: {
      primary: '222 84% 5%',
      secondary: '210 40% 98%',
      accent: '217 91% 60%',
    },
    professional: {
      primary: '212 34% 17%',
      secondary: '214 32% 91%',
      accent: '214 84% 56%',
    },
    warm: {
      primary: '20 14% 4%',
      secondary: '60 4% 98%',
      accent: '24 96% 53%',
    },
    nature: {
      primary: '159 61% 17%',
      secondary: '138 76% 97%',
      accent: '142 71% 45%',
    }
  };

  const colors = presets[preset as keyof typeof presets];
  if (colors) {
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
  }
}

// Apply landing page customizations
function applyLandingPageCustomizations(config: any, root: HTMLElement) {
  if (config.hero_background_color) {
    const hsl = hexToHsl(config.hero_background_color);
    root.style.setProperty('--hero-bg', hsl);
  }
  
  if (config.cta_button_color) {
    const hsl = hexToHsl(config.cta_button_color);
    root.style.setProperty('--cta-button', hsl);
  }
  
  if (config.custom_fonts?.primary) {
    root.style.setProperty('--font-primary', config.custom_fonts.primary);
  }
  
  if (config.custom_fonts?.heading) {
    root.style.setProperty('--font-heading', config.custom_fonts.heading);
  }
}

// Utility function to update favicon
function updateFavicon(url: string) {
  const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  
  if (existingFavicon) {
    existingFavicon.href = url;
  } else {
    const newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';
    newFavicon.href = url;
    document.head.appendChild(newFavicon);
  }
}

export default DynamicThemeProvider;
