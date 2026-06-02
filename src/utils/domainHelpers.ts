/**
 * Utility functions for domain management
 */

import { formatDistanceToNow } from 'date-fns';

export interface UptimeInfo {
  days: number;
  hours: number;
  minutes: number;
  formatted: string;
  badge: 'success' | 'warning' | 'default';
}

/**
 * Calculate uptime from a given date
 */
export const calculateUptime = (startDate: string | null): UptimeInfo => {
  if (!startDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Not active',
      badge: 'default'
    };
  }

  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let formatted = '';
  let badge: 'success' | 'warning' | 'default' = 'default';

  if (days > 7) {
    formatted = `${days} days`;
    badge = 'success';
  } else if (days >= 1) {
    formatted = `${days} day${days > 1 ? 's' : ''}`;
    badge = 'warning';
  } else if (hours >= 1) {
    formatted = `${hours} hour${hours > 1 ? 's' : ''}`;
    badge = 'default';
  } else {
    formatted = `${minutes} min${minutes > 1 ? 's' : ''}`;
    badge = 'default';
  }

  return { days, hours, minutes, formatted, badge };
};

/**
 * Format last checked time in relative format
 */
export const formatLastChecked = (date: string | null): string => {
  if (!date) return 'Never';
  
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
};

/**
 * Get domain display value from config
 */
export const getDomainDisplay = (config: {
  custom_domain?: string | null;
  custom_subdomain?: string | null;
}): { value: string; type: 'domain' | 'subdomain' } => {
  if (config.custom_domain) {
    return { value: config.custom_domain, type: 'domain' };
  }
  if (config.custom_subdomain) {
    return { value: config.custom_subdomain, type: 'subdomain' };
  }
  return { value: 'No domain', type: 'subdomain' };
};
