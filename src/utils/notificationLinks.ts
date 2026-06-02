/**
 * Valid notification routes mapping
 * Maps notification types to their correct application routes
 */
export const VALID_NOTIFICATION_ROUTES: Record<string, string> = {
  // Lease
  lease_renewal: '/dashboard?tab=Rent Payments&subTab=lease-renewal',
  
  // Maintenance
  maintenance_completed: '/dashboard?tab=Maintenance Request',
  
  // Payments
  payment_due: '/dashboard?tab=Rent Payments',
  payment_overdue: '/dashboard?tab=Rent Payments',
  placement_fee_due: '/dashboard?tab=Messages',
  
  // Messages
  message_received: '/messages',
  
  // Admin Messages
  admin_message: '/messages',
  
  // Property Matches
  property_match: '/dashboard?tab=My Matches',
  
  // Applications
  application_approved: '/dashboard?tab=Properties',
  application_rejected: '/dashboard?tab=Properties',
  application_credits_refreshed: '/dashboard?tab=Properties',
  
  // Points & Rewards
  points_awarded: '/dashboard?tab=My Points',
  referral_reward: '/dashboard?tab=My Points',
  
  // Appointments
  appointment_scheduled: '/messages?messageSubtab=calendar',
  appointment_cancelled: '/messages?messageSubtab=calendar',
};

/**
 * Category-based fallback routes
 * Used when notification type is not found in the main mapping
 */
const CATEGORY_ROUTES: Record<string, string> = {
  'Maintenance': '/dashboard?tab=Maintenance Request',
  'Payment': '/dashboard?tab=Rent Payments',
  'Application': '/dashboard?tab=Properties',
  'Appointments': '/dashboard',
  'Documents': '/tenant-profile?tab=documents',
  'Lease': '/tenant-profile?tab=lease',
  'Property': '/dashboard',
  'Points': '/dashboard?tab=My Points',
  'Rewards': '/dashboard?tab=My Points',
  'Messages': '/messages',
  'Admin Communications': '/messages',
  'general': '/dashboard',
};

/**
 * Get the correct route for a notification type
 * @param type - The notification type
 * @param category - Optional category for fallback routing
 * @param fallback - Fallback route if type is not found (default: '/dashboard')
 * @returns The correct route path
 */
export const getNotificationLink = (
  type: string, 
  category?: string, 
  fallback = '/dashboard'
): string => {
  // First, try to get route from type
  let route = VALID_NOTIFICATION_ROUTES[type];
  
  // Second, try category-based routing
  if (!route && category && CATEGORY_ROUTES[category]) {
    route = CATEGORY_ROUTES[category];
  }
  
  // Use fallback if no route found
  if (!route) {
    route = fallback;
  }
  
  // Append internal navigation flag for dashboard routes to prevent loading flash
  if (route.startsWith('/dashboard')) {
    const separator = route.includes('?') ? '&' : '?';
    return `${route}${separator}internal=true`;
  }
  
  return route;
};

/**
 * Validate and correct a notification link
 * @param link - The link to validate
 * @returns The corrected link or the original if valid
 */
export const validateNotificationLink = (link: string | null): string => {
  if (!link) return '/dashboard';
  
  // Map of common invalid links to correct routes
  const linkMap: Record<string, string> = {
    '/tenant/lease-renewal': '/dashboard',
    '/maintenance-requests': '/maintenance',
    '/rent-payments': '/payments',
  };
  
  return linkMap[link] || link;
};

/**
 * All valid application routes for notifications
 */
export const VALID_ROUTES = [
  '/dashboard',
  '/maintenance',
  '/payments',
  '/pay-rent',
  '/messages',
  '/applications',
] as const;
