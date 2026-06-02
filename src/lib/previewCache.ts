// Simple in-memory cache for document previews
// Keeps documents cached during active session for instant repeat views

interface CachedPreview {
  blob: Blob;
  url: string;
  timestamp: number;
}

const cache = new Map<string, CachedPreview>();
const MAX_AGE = 5 * 60 * 1000; // 5 minutes

export const previewCache = {
  get(key: string): string | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > MAX_AGE) {
      URL.revokeObjectURL(cached.url);
      cache.delete(key);
      return null;
    }
    
    return cached.url;
  },
  
  set(key: string, blob: Blob): string {
    // Clean up old entry if exists
    const existing = cache.get(key);
    if (existing) {
      URL.revokeObjectURL(existing.url);
    }
    
    const url = URL.createObjectURL(blob);
    cache.set(key, { blob, url, timestamp: Date.now() });
    return url;
  },
  
  remove(key: string): void {
    const cached = cache.get(key);
    if (cached) {
      URL.revokeObjectURL(cached.url);
      cache.delete(key);
    }
  },
  
  clear(): void {
    cache.forEach(({ url }) => URL.revokeObjectURL(url));
    cache.clear();
  },
  
  getStats() {
    return {
      count: cache.size,
      keys: Array.from(cache.keys())
    };
  }
};

