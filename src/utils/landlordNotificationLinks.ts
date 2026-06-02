/**
 * Valid landlord notification routes mapping
 * Maps notification types to their correct landlord application routes
 */
export const VALID_LANDLORD_NOTIFICATION_ROUTES: Record<string, string> = {
  // Maintenance
  maintenance_request_received: '/dashboard?portfolioId=everything&tab=Maintenance',
  
  // Applications
  application_received: '/dashboard?portfolioId=everything&tab=Tenants/Applications',
  
  // Appointments
  appointment_reminder: '/messages',
  
  // Payments
  payment_received: '/dashboard?portfolioId=everything&tab=Payments',
  placement_fee_due: '/messages',
  
  // Lease
  lease_expiring_soon: '/dashboard?tab=Lease Expirations&subTab=expirations',
  lease_renewal_request: '/dashboard?tab=Lease Expirations&subTab=renewals',
  lease_renewal_declined: '/dashboard?tab=Lease Expirations&subTab=renewals',
  lease_contract_signed: '/dashboard?tab=Lease Expirations&subTab=renewals',
  
  // Messages
  message_received: '/messages',
  
  // Admin Messages
  admin_message: '/messages',
  
  
  // Portfolio & Account
  portfolio_invite: '/dashboard?portfolioId={portfolio_id}', // Dynamic - uses portfolio ID from invitation
  account_invite: '/dashboard', // Shows portfolio selection
  
  // Property Limits
  property_limit_warning: '/dashboard?portfolioId=everything',
  
  // Points & Rewards
  portfolio_points: '/portfolio/everything/settings?tab=points',
};

/**
 * Category-based fallback routes for landlords
 * Used when notification type is not found in the main mapping
 */
const LANDLORD_CATEGORY_ROUTES: Record<string, string> = {
  'Maintenance': '/dashboard?portfolioId=everything&tab=Maintenance',
  'Payment': '/dashboard?portfolioId=everything&tab=Payments',
  'Applications': '/applications',
  'Application': '/applications',
  'Appointments': '/messages',
  'Admin Communications': '/messages',
  'Documents': '/dashboard',
  'Lease': '/dashboard?tab=Lease Expirations&subTab=renewals',
  'Lease Management': '/dashboard?tab=Lease Expirations&subTab=renewals',
  'Property': '/dashboard',
  'Portfolio Invitation': '/dashboard',
  'Account Invitation': '/dashboard',
  'general': '/dashboard',
};

/**
 * Get the correct route for a landlord notification type
 * @param type - The notification type
 * @param category - Optional category for fallback routing
 * @param fallback - Fallback route if type is not found (default: '/dashboard')
 * @returns The correct route path
 */
export const getLandlordNotificationLink = (
  type: string, 
  category?: string, 
  fallback = '/dashboard'
): string => {
  // First, try to get route from type
  const typeRoute = VALID_LANDLORD_NOTIFICATION_ROUTES[type];
  if (typeRoute) return typeRoute;
  
  // Second, try category-based routing
  if (category && LANDLORD_CATEGORY_ROUTES[category]) {
    return LANDLORD_CATEGORY_ROUTES[category];
  }
  
  // Finally, return fallback
  return fallback;
};

/**
 * Check if a notification is an invitation that should not trigger navigation
 * @param type - The notification type
 * @returns True if the notification is an invitation
 */
export const isInvitationNotification = (type: string): boolean => {
  return type === 'portfolio_invite' || type === 'account_invite';
};

/**
 * All valid landlord application routes for notifications
 */
export const VALID_LANDLORD_ROUTES = [
  '/dashboard',
  '/maintenance',
  '/landlord/payments',
  '/applications',
  '/messages',
  '/admin-messages',
] as const;
