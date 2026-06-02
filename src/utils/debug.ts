// Debug utilities for property card tenant management
export const TENANT_DEBUG_KEY = 'tenant-debug';

export const isTenantDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tenant-debug') === 'true') return true;
  
  // Check localStorage
  return localStorage.getItem(TENANT_DEBUG_KEY) === 'true';
};

export const enableTenantDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TENANT_DEBUG_KEY, 'true');
    console.log('🔍 Tenant management debugging enabled');
  }
};

export const disableTenantDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TENANT_DEBUG_KEY);
    console.log('🔍 Tenant management debugging disabled');
  }
};

export const debugLog = (component: string, message: string, data?: any): void => {
  if (!isTenantDebugEnabled()) return;
  
  console.log(`🔍 [${component}] ${message}`, data || '');
};

// Report-specific debugging
export const REPORT_DEBUG_KEY = 'report-debug';

export const isReportDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('report-debug') === 'true') return true;
  
  // Check localStorage
  return localStorage.getItem(REPORT_DEBUG_KEY) === 'true' || isTenantDebugEnabled();
};

export const enableReportDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REPORT_DEBUG_KEY, 'true');
    console.log('🔍 Report debugging enabled');
  }
};

export const disableReportDebug = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REPORT_DEBUG_KEY);
    console.log('🔍 Report debugging disabled');
  }
};

export const reportDebugLog = (component: string, message: string, data?: any): void => {
  if (!isReportDebugEnabled()) return;
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`🔍 [${timestamp}] [${component}] ${message}`, data || '');
};

// Global debug helpers for reports
if (typeof window !== 'undefined') {
  (window as any).enableReportDebug = enableReportDebug;
  (window as any).disableReportDebug = disableReportDebug;
}

// Global debug helpers
if (typeof window !== 'undefined') {
  (window as any).enableTenantDebug = enableTenantDebug;
  (window as any).disableTenantDebug = disableTenantDebug;
  
  // Debug mode is opt-in only:
  // - Add ?tenant-debug=true to URL, OR
  // - Run enableTenantDebug() in browser console
  
  // One-time cleanup: Remove any lingering debug flags from previous sessions
  const existingDebugFlag = localStorage.getItem(TENANT_DEBUG_KEY);
  if (existingDebugFlag === 'true') {
    localStorage.removeItem(TENANT_DEBUG_KEY);
    console.log('🔍 Cleaned up tenant debug flag from previous session');
  }
}