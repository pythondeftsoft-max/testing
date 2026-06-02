
import { supabase } from '@/integrations/supabase/client';

// Database query optimization utilities
export class DatabaseOptimizer {
  // Optimized portfolio points queries with proper indexing hints
  async getPortfolioPointsOptimized(portfolioId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('portfolio_points')
      .select(`
        id,
        points_awarded,
        source_event_type,
        created_at,
        notes
      `)
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Portfolio points query error:', error);
      throw error;
    }

    return data;
  }

  // Batch portfolio operations for better performance
  async batchUpdatePortfolioDistributions(
    portfolioId: string, 
    distributions: Array<{ user_id: string; distribution_percent: number }>
  ) {
    // Deactivate existing distributions
    const { error: deactivateError } = await supabase
      .from('portfolio_points_distribution')
      .update({ active: false })
      .eq('portfolio_id', portfolioId);

    if (deactivateError) throw deactivateError;

    // Insert new distributions
    const newDistributions = distributions.map(d => ({
      portfolio_id: portfolioId,
      user_id: d.user_id,
      distribution_percent: d.distribution_percent,
      active: true
    }));

    const { error: insertError } = await supabase
      .from('portfolio_points_distribution')
      .insert(newDistributions);

    if (insertError) throw insertError;
  }

  // Connection pooling and retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`Operation attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          await this.delay(delayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Query performance analytics
  async analyzeQueryPerformance(portfolioId: string) {
    const start = performance.now();

    const queries = await Promise.all([
      supabase.from('portfolio_points').select('count').eq('portfolio_id', portfolioId),
      supabase.from('portfolio_points_distribution').select('count').eq('portfolio_id', portfolioId),
      supabase.from('properties').select('count').eq('portfolio_id', portfolioId)
    ]);

    const duration = performance.now() - start;

    return {
      queryTime: duration,
      portfolioPoints: queries[0].count || 0,
      distributions: queries[1].count || 0,
      properties: queries[2].count || 0
    };
  }
}

// Caching layer for frequently accessed data
export class DataCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expiry: now + (ttl || this.defaultTTL)
    });

    return data;
  }

  invalidate(pattern?: string) {
    if (pattern) {
      const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Rate limiting utility
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private limits = {
    points_processing: { requests: 10, window: 60000 }, // 10 requests per minute
    portfolio_events: { requests: 5, window: 60000 },   // 5 requests per minute
    bulk_operations: { requests: 2, window: 60000 }     // 2 requests per minute
  };

  async checkLimit(operation: string, userId: string): Promise<boolean> {
    const key = `${operation}:${userId}`;
    const now = Date.now();
    const limit = this.limits[operation as keyof typeof this.limits];

    if (!limit) return true;

    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(time => now - time < limit.window);

    if (validRequests.length >= limit.requests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  getRemainingRequests(operation: string, userId: string): number {
    const key = `${operation}:${userId}`;
    const now = Date.now();
    const limit = this.limits[operation as keyof typeof this.limits];

    if (!limit) return Infinity;

    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(time => now - time < limit.window);

    return Math.max(0, limit.requests - validRequests.length);
  }
}
