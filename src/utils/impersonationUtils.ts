/**
 * Utility functions for handling user impersonation in admin mode.
 *
 * SECURITY: We never persist the admin's JWT (access_token / refresh_token)
 * to localStorage. Storing raw JWTs there exposes them to any XSS that lands
 * on an admin page. Instead, we store only a non-sensitive flag identifying
 * the impersonated user. To exit impersonation, the admin signs back in.
 */

const LEGACY_BACKUP_KEY = 'admin_session_backup';

// Auth state cleanup utility for safe impersonation
export const cleanupAuthState = () => {
  // Remove legacy raw-token backup if present from older builds
  localStorage.removeItem(LEGACY_BACKUP_KEY);

  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');

  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });

  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// One-time cleanup of any legacy raw JWT backup left over from older builds.
// Safe to call on app boot.
export const purgeLegacyAdminSessionBackup = () => {
  try {
    localStorage.removeItem(LEGACY_BACKUP_KEY);
  } catch {
    // ignore
  }
};

// Check if currently in impersonation mode
export const isImpersonationMode = (): boolean => {
  return localStorage.getItem('impersonation_mode') === 'true';
};

// Get impersonated user data
export const getImpersonatedUser = () => {
  const userData = localStorage.getItem('impersonated_user');
  return userData ? JSON.parse(userData) : null;
};

// Get admin id who initiated the impersonation (no tokens, just the uuid)
export const getAdminImpersonatorId = (): string | null => {
  return localStorage.getItem('admin_impersonator_id');
};

// Backwards-compat shim: previous callers expected an object. Now returns
// only the non-sensitive admin user id, or null. Tokens are NEVER stored.
export const getAdminSessionBackup = (): { user_id: string } | null => {
  const id = getAdminImpersonatorId();
  return id ? { user_id: id } : null;
};

// Clear all impersonation data
export const clearImpersonationData = () => {
  localStorage.removeItem('impersonation_mode');
  localStorage.removeItem('impersonated_user');
  localStorage.removeItem('admin_impersonator_id');
  localStorage.removeItem(LEGACY_BACKUP_KEY);
};

// End impersonation and return to admin dashboard
export const endImpersonation = () => {
  clearImpersonationData();
  window.location.href = '/dashboard?tab=directory';
};

// Store impersonation data and create user session.
// We deliberately store ONLY non-sensitive identifiers — never JWTs.
export const storeImpersonationData = (
  adminSession: any,
  targetUser: { id: string; first_name: string; last_name: string; email: string; user_type: string }
) => {
  // Store only the admin's user id for audit/restoration UX
  if (adminSession?.user?.id) {
    localStorage.setItem('admin_impersonator_id', adminSession.user.id);
  }

  // Store impersonation mode flag
  localStorage.setItem('impersonation_mode', 'true');

  // Store impersonated user data (non-sensitive)
  localStorage.setItem('impersonated_user', JSON.stringify({
    id: targetUser.id,
    name: `${targetUser.first_name} ${targetUser.last_name}`,
    email: targetUser.email,
    user_type: targetUser.user_type,
    started_at: Date.now(),
  }));
};

// Get redirect URL based on user type
export const getRedirectUrlForUserType = (userType: string): string => {
  switch (userType) {
    case 'tenant':
      return '/dashboard';
    case 'landlord':
    case 'individual_owner':
    case 'property_manager':
      return '/dashboard';
    default:
      return '/';
  }
};
