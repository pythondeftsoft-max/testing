/**
 * Validates a US routing number using the ABA checksum algorithm
 */
export const validateRoutingNumber = (routing: string): boolean => {
  if (!/^\d{9}$/.test(routing)) {
    return false;
  }
  
  // ABA checksum validation
  const digits = routing.split('').map(Number);
  const checksum = 3 * (digits[0] + digits[3] + digits[6]) +
                  7 * (digits[1] + digits[4] + digits[7]) +
                  (digits[2] + digits[5] + digits[8]);
  
  return checksum % 10 === 0;
};

/**
 * Validates account number format (4-17 digits)
 */
export const validateAccountNumber = (accountNumber: string): boolean => {
  return /^\d{4,17}$/.test(accountNumber);
};

/**
 * Masks an account number to show only last 4 digits
 */
export const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length < 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
};

/**
 * Masks a routing number to show only last 4 digits
 */
export const maskRoutingNumber = (routingNumber: string): string => {
  if (routingNumber.length < 4) return routingNumber;
  return `****${routingNumber.slice(-4)}`;
};

/**
 * Formats account type for display
 */
export const formatAccountType = (accountType: 'checking' | 'savings'): string => {
  return accountType.charAt(0).toUpperCase() + accountType.slice(1);
};