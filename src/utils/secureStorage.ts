// Secure client storage utilities with encryption for sensitive data
import { sanitizeInput } from './inputValidation';

// Simple encryption for client-side data (not cryptographically secure but better than plain text)
class SimpleEncryption {
  private static encode(str: string): string {
    return btoa(encodeURIComponent(str));
  }

  private static decode(str: string): string {
    try {
      return decodeURIComponent(atob(str));
    } catch {
      return '';
    }
  }

  static encrypt(data: string, key: string = 'default'): string {
    try {
      const encoded = this.encode(data);
      const keyHash = this.simpleHash(key);
      let result = '';
      
      for (let i = 0; i < encoded.length; i++) {
        const keyChar = keyHash.charCodeAt(i % keyHash.length);
        const dataChar = encoded.charCodeAt(i);
        result += String.fromCharCode((dataChar + keyChar) % 256);
      }
      
      return this.encode(result);
    } catch {
      return '';
    }
  }

  static decrypt(encryptedData: string, key: string = 'default'): string {
    try {
      const data = this.decode(encryptedData);
      const keyHash = this.simpleHash(key);
      let result = '';
      
      for (let i = 0; i < data.length; i++) {
        const keyChar = keyHash.charCodeAt(i % keyHash.length);
        const dataChar = data.charCodeAt(i);
        result += String.fromCharCode((dataChar - keyChar + 256) % 256);
      }
      
      return this.decode(result);
    } catch {
      return '';
    }
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export class SecureStorage {
  private static SESSION_KEY = 'secure_session_data';
  private static SENSITIVE_PREFIX = 'sec_';

  // Store sensitive data with encryption
  static setSecureItem(key: string, value: string, encrypt: boolean = true): void {
    try {
      const sanitizedKey = sanitizeInput(key);
      const sanitizedValue = sanitizeInput(value);
      
      if (!sanitizedKey || !sanitizedValue) {
        console.warn('Invalid key or value for secure storage');
        return;
      }

      const storageValue = encrypt ? 
        SimpleEncryption.encrypt(sanitizedValue, sanitizedKey) : 
        sanitizedValue;

      localStorage.setItem(
        `${this.SENSITIVE_PREFIX}${sanitizedKey}`, 
        storageValue
      );
    } catch (error) {
      console.error('Failed to store secure item:', error);
    }
  }

  // Retrieve sensitive data with decryption
  static getSecureItem(key: string, encrypted: boolean = true): string | null {
    try {
      const sanitizedKey = sanitizeInput(key);
      if (!sanitizedKey) return null;

      const stored = localStorage.getItem(`${this.SENSITIVE_PREFIX}${sanitizedKey}`);
      if (!stored) return null;

      return encrypted ? 
        SimpleEncryption.decrypt(stored, sanitizedKey) : 
        stored;
    } catch (error) {
      console.error('Failed to retrieve secure item:', error);
      return null;
    }
  }

  // Remove sensitive data
  static removeSecureItem(key: string): void {
    try {
      const sanitizedKey = sanitizeInput(key);
      if (!sanitizedKey) return;

      localStorage.removeItem(`${this.SENSITIVE_PREFIX}${sanitizedKey}`);
    } catch (error) {
      console.error('Failed to remove secure item:', error);
    }
  }

  // Clear all sensitive data
  static clearSecureData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.SENSITIVE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear secure data:', error);
    }
  }

  // Store session data with automatic expiry
  static setSessionData(data: Record<string, any>, expiryMinutes: number = 60): void {
    try {
      const sessionData = {
        data: data,
        expires: Date.now() + (expiryMinutes * 60 * 1000),
        created: Date.now()
      };

      const encrypted = SimpleEncryption.encrypt(
        JSON.stringify(sessionData), 
        this.SESSION_KEY
      );

      sessionStorage.setItem(this.SESSION_KEY, encrypted);
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }

  // Retrieve session data with expiry check
  static getSessionData(): Record<string, any> | null {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      const decrypted = SimpleEncryption.decrypt(stored, this.SESSION_KEY);
      if (!decrypted) return null;

      const sessionData = JSON.parse(decrypted);
      
      // Check if expired
      if (Date.now() > sessionData.expires) {
        this.clearSessionData();
        return null;
      }

      return sessionData.data;
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      this.clearSessionData();
      return null;
    }
  }

  // Clear session data
  static clearSessionData(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }

  // Check storage health and clean up expired items
  static performMaintenance(): void {
    try {
      // Clean up expired session data
      this.getSessionData(); // This will auto-remove if expired

      // Remove very old localStorage items (optional)
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.SENSITIVE_PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            // If we can't decrypt or it's malformed, remove it
            if (!item || item.length > 10000) { // Suspiciously large
              localStorage.removeItem(key);
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Storage maintenance failed:', error);
    }
  }
}

// Initialize maintenance on load
SecureStorage.performMaintenance();