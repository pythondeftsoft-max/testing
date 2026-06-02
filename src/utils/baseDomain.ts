/**
 * Utility functions for determining the base domain for white-label subdomains
 */

export const getBaseDomain = (): string => {
  if (typeof window === 'undefined') {
    return 'openkeyhousing.com'; // Default for SSR
  }

  const hostname = window.location.hostname;
  
  // For local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'openkeyhousing.com'; // Default for development
  }

  // Detect the base domain based on current hostname
  if (hostname.includes('openkeyhousing.com')) {
    return 'openkeyhousing.com';
  } else if (hostname.includes('openkey.app')) {
    return 'openkey.app';
  } else if (hostname.includes('lovable.app')) {
    // For Lovable preview domains, use openkeyhousing.com as the subdomain base
    return 'openkeyhousing.com';
  }

  // Default fallback
  return 'openkeyhousing.com';
};

export const buildSubdomainUrl = (subdomain: string): string => {
  const baseDomain = getBaseDomain();
  return `https://${subdomain}.${baseDomain}`;
};

export const getSubdomainPlaceholder = (): string => {
  const baseDomain = getBaseDomain();
  return `yourcompany.${baseDomain}`;
};

export const getSubdomainSuffix = (): string => {
  const baseDomain = getBaseDomain();
  return `.${baseDomain}`;
};