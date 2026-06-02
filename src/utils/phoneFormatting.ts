/**
 * Phone Number Formatting Utilities
 * Formats phone numbers for display and storage
 */

/**
 * Formats phone number as user types: (516) 477-0901
 * @param value - Raw input value
 * @returns Formatted phone number
 */
export const formatPhoneInput = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const trimmed = numbers.slice(0, 10);
  
  // Format based on length
  if (trimmed.length === 0) return '';
  if (trimmed.length <= 3) return `(${trimmed}`;
  if (trimmed.length <= 6) return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3)}`;
  return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`;
};

/**
 * Removes formatting from phone number for storage: 5164770901
 * @param value - Formatted phone number
 * @returns Clean phone number with only digits
 */
export const cleanPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};
