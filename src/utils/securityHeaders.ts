// Security headers and CSP configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const CONTENT_SECURITY_POLICY = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.stripe.com https://js.stripe.com",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'img-src': "'self' data: https: blob:",
  'font-src': "'self' https://fonts.gstatic.com",
  'connect-src': "'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://api.stripe.com",
  'frame-src': "'self' https://*.stripe.com https://js.stripe.com",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'upgrade-insecure-requests': '',
};

export const generateCSPHeader = (): string => {
  return Object.entries(CONTENT_SECURITY_POLICY)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');
};

// Apply security headers (for client-side meta tags)
export const applySecurityHeaders = (): void => {
  // Add CSP meta tag
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = generateCSPHeader();
  document.head.appendChild(cspMeta);

  // Add other security meta tags
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    const meta = document.createElement('meta');
    meta.httpEquiv = name;
    meta.content = value;
    document.head.appendChild(meta);
  });
};

// Rate limiting state management
interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const rateLimitStorage = new Map<string, RateLimitState>();

export const checkRateLimit = (
  key: string, 
  maxAttempts: number = 5, 
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  blockDurationMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remainingAttempts: number; blockedUntil?: Date } => {
  const now = Date.now();
  const state = rateLimitStorage.get(key) || { attempts: 0, lastAttempt: 0 };

  // Check if currently blocked
  if (state.blockedUntil && now < state.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(state.blockedUntil)
    };
  }

  // Reset if window has passed
  if (now - state.lastAttempt > windowMs) {
    state.attempts = 0;
    state.blockedUntil = undefined;
  }

  // Check if limit exceeded
  if (state.attempts >= maxAttempts) {
    state.blockedUntil = now + blockDurationMs;
    rateLimitStorage.set(key, state);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(state.blockedUntil)
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - state.attempts - 1
  };
};

export const recordAttempt = (key: string): void => {
  const now = Date.now();
  const state = rateLimitStorage.get(key) || { attempts: 0, lastAttempt: 0 };
  
  state.attempts += 1;
  state.lastAttempt = now;
  
  rateLimitStorage.set(key, state);
};

export const clearRateLimit = (key: string): void => {
  rateLimitStorage.delete(key);
};