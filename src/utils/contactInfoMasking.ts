/**
 * Contact Information Masking Utilities
 * Used to mask sensitive contact info for non-Primary applicants
 */

export const maskEmail = (email: string): string => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const firstChar = username[0];
  return `${firstChar}•••@${domain}`;
};

export const maskPhone = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // US format: (•••) •••-1234
    return `(•••) •••-${cleaned.slice(-4)}`;
  }
  if (cleaned.length === 11) {
    // US format with country code: +1 (•••) •••-1234
    return `+1 (•••) •••-${cleaned.slice(-4)}`;
  }
  
  // Default: show last 4 digits
  return `•••-${cleaned.slice(-4)}`;
};

export const maskAddress = (address: string, city?: string, zipCode?: string): string => {
  // Only show city and zip code
  const parts = [];
  if (city) parts.push(city);
  if (zipCode) parts.push(zipCode);
  return parts.join(', ') || 'City, ZIP';
};

export const shouldMaskContact = (isPrimary: boolean): boolean => {
  return !isPrimary;
};

export const getUnlockMessage = (action: 'view' | 'access' | 'message' | 'document'): string => {
  const messages = {
    view: 'Set as Primary to view full contact details',
    access: 'Set as Primary to unlock full profile access',
    message: 'Set as Primary for unlimited messaging',
    document: 'Set as Primary to view documents'
  };
  return messages[action];
};
