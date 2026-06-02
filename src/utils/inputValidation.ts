

// Enhanced input validation utilities to prevent XSS and injection attacks
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters and limit length
  return input
    .trim()
    .slice(0, 1000) // Prevent excessively long inputs
    .replace(/[<>'"&]/g, '') // Remove XSS characters including ampersand
    .replace(/[;\-]{2,}/g, '') // Remove SQL injection patterns
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\{.*\}/g, '') // Remove potential template injection
    .replace(/\$\{.*\}/g, '') // Remove ES6 template literals
    .replace(/eval\s*\(/gi, '') // Remove eval attempts
    .replace(/Function\s*\(/gi, '') // Remove Function constructor
    .replace(/setTimeout\s*\(/gi, '') // Remove setTimeout
    .replace(/setInterval\s*\(/gi, ''); // Remove setInterval
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validateNumericInput = (input: string): number | null => {
  if (!input || typeof input !== 'string') return null;
  
  const sanitized = input.replace(/[^\d.-]/g, '');
  const num = parseFloat(sanitized);
  
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < 0 || num > 1000000) return null; // Reasonable bounds for rent/income
  
  return num;
};

export const validateZipcode = (zipcode: string): string => {
  if (!zipcode || typeof zipcode !== 'string') return '';
  
  // Allow only alphanumeric characters and hyphens for international zip codes
  return zipcode.replace(/[^a-zA-Z0-9\-\s]/g, '').slice(0, 20);
};

export const validateLocationInput = (location: string): string => {
  if (!location || typeof location !== 'string') return '';
  
  // Allow letters, numbers, spaces, commas, and basic punctuation
  return location.replace(/[^a-zA-Z0-9\s,.\-]/g, '').slice(0, 100);
};

// Enhanced validation for payment amounts
export const validatePaymentAmount = (amount: string | number, minAmount: number = 0, maxAmount: number = 50000): { valid: boolean; sanitized: number | null; error?: string } => {
  if (!amount && amount !== 0) return { valid: false, sanitized: null, error: 'Amount is required' };
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return { valid: false, sanitized: null, error: 'Invalid amount format' };
  }
  
  if (numAmount < minAmount) {
    return { valid: false, sanitized: null, error: `Amount must be at least $${minAmount}` };
  }
  
  if (numAmount > maxAmount) {
    return { valid: false, sanitized: null, error: `Amount cannot exceed $${maxAmount}` };
  }
  
  // Round to 2 decimal places for currency
  const sanitized = Math.round(numAmount * 100) / 100;
  return { valid: true, sanitized };
};

// Rate limiting for sensitive operations with enhanced security
export const validateActionFrequency = (lastAction: Date | null, minimumIntervalMs: number = 5000): { allowed: boolean; waitTime?: number } => {
  if (!lastAction) return { allowed: true };
  
  const timeSinceLastAction = Date.now() - lastAction.getTime();
  
  if (timeSinceLastAction < minimumIntervalMs) {
    return { 
      allowed: false, 
      waitTime: Math.ceil((minimumIntervalMs - timeSinceLastAction) / 1000) 
    };
  }
  
  return { allowed: true };
};

// Enhanced email validation with security checks
export const validateEmailSecure = (email: string): { valid: boolean; sanitized: string; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email is required' };
  }
  
  const sanitized = sanitizeInput(email.toLowerCase().trim());
  
  // Check for common email injection patterns
  if (sanitized.includes('%0a') || sanitized.includes('%0d') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return { valid: false, sanitized: '', error: 'Invalid email format' };
  }
  
  if (!validateEmail(sanitized)) {
    return { valid: false, sanitized: '', error: 'Invalid email format' };
  }
  
  return { valid: true, sanitized };
};

// URL validation with security checks
export const validateUrlSecure = (url: string): { valid: boolean; sanitized: string; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, sanitized: '', error: 'URL is required' };
  }
  
  const sanitized = url.trim();
  
  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
  const lowerUrl = sanitized.toLowerCase();
  
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return { valid: false, sanitized: '', error: 'Invalid URL protocol' };
  }
  
  // Only allow http, https, mailto, tel
  if (!(/^https?:\/\/|^mailto:|^tel:/.test(lowerUrl))) {
    return { valid: false, sanitized: '', error: 'Only HTTP, HTTPS, mailto, and tel URLs are allowed' };
  }
  
  try {
    new URL(sanitized);
    return { valid: true, sanitized };
  } catch {
    return { valid: false, sanitized: '', error: 'Invalid URL format' };
  }
};

