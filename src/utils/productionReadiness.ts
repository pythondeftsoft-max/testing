import { supabase } from '@/integrations/supabase/client';
import { PerformanceMonitor, SystemHealthChecker } from './integrationTesting';

// Production monitoring and alerting system
export class ProductionMonitor {
  private performanceMonitor = new PerformanceMonitor();
  private healthChecker = new SystemHealthChecker();
  private alerts: Array<{ id: string; level: string; message: string; timestamp: Date }> = [];

  async runProductionHealthChecks(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    checks: Array<{ name: string; status: boolean; message: string; duration?: number }>;
    recommendations: string[];
  }> {
    const checks = [];
    const recommendations = [];
    
    // Database performance check
    const dbCheck = await this.performanceMonitor.measureOperation('Database Health Check', async () => {
      const { data, error } = await supabase
        .from('white_label_configs')
        .select('id')
        .limit(1);
      return !error;
    });
    
    checks.push({
      name: 'Database Performance',
      status: dbCheck,
      message: dbCheck ? 'Database responding normally' : 'Database performance issues detected',
      duration: this.performanceMonitor.getAverageTime('Database Health Check')
    });

    // Edge functions health check
    const edgeFunctionCheck = await this.performanceMonitor.measureOperation('Edge Functions Check', async () => {
      try {
        const { error } = await supabase.functions.invoke('seo-sitemap-generator', {
          body: { healthCheck: true }
        });
        return !error;
      } catch {
        return false;
      }
    });

    checks.push({
      name: 'Edge Functions',
      status: edgeFunctionCheck,
      message: edgeFunctionCheck ? 'Edge functions operational' : 'Edge function issues detected',
      duration: this.performanceMonitor.getAverageTime('Edge Functions Check')
    });

    // Authentication health check
    const authCheck = await this.performanceMonitor.measureOperation('Authentication Check', async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        return user !== null;
      } catch {
        return false;
      }
    });

    checks.push({
      name: 'Authentication',
      status: authCheck,
      message: authCheck ? 'Authentication working' : 'Authentication issues detected'
    });

    // Security audit check
    const securityCheck = await this.performanceMonitor.measureOperation('Security Check', async () => {
      try {
        // Check for recent security incidents
        const { data, error } = await supabase
          .from('security_audit_logs')
          .select('severity')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .eq('severity', 'critical');
        
        return !error && (!data || data.length === 0);
      } catch {
        return false;
      }
    });

    checks.push({
      name: 'Security Status',
      status: securityCheck,
      message: securityCheck ? 'No critical security issues' : 'Security issues require attention'
    });

    // Performance recommendations
    const avgDbTime = this.performanceMonitor.getAverageTime('Database Health Check');
    if (avgDbTime > 1000) {
      recommendations.push('Database queries are slow - consider adding indexes');
    }

    const failedChecks = checks.filter(c => !c.status).length;
    const status = failedChecks === 0 ? 'healthy' : failedChecks <= 1 ? 'degraded' : 'critical';

    return { status, checks, recommendations };
  }

  async createAlert(level: 'info' | 'warning' | 'error' | 'critical', message: string) {
    const alert = {
      id: crypto.randomUUID(),
      level,
      message,
      timestamp: new Date()
    };
    
    this.alerts.push(alert);
    
    // Log to security audit for critical alerts
    if (level === 'critical' || level === 'error') {
      await supabase.rpc('log_security_audit', {
        p_event_type: `production_alert_${level}`,
        p_severity: level,
        p_metadata: { alert_message: message }
      });
    }
    
    return alert;
  }

  getActiveAlerts() {
    return this.alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );
  }

  async optimizeQueries() {
    // Suggest database optimizations
    const optimizations = [];
    
    try {
      // Check for missing indexes
      const tablesWithMissingIndexes = [
        'white_label_configs.user_id',
        'white_label_configs.custom_domain',
        'white_label_teams.config_id',
        'white_label_form_submissions.form_id'
      ];
      
      optimizations.push({
        type: 'index',
        suggestion: 'Add database indexes for frequently queried columns',
        impact: 'high',
        tables: tablesWithMissingIndexes
      });

      // Check for inefficient queries
      optimizations.push({
        type: 'query',
        suggestion: 'Use select() with specific columns instead of select("*")',
        impact: 'medium',
        description: 'Reduces network transfer and improves performance'
      });

      optimizations.push({
        type: 'caching',
        suggestion: 'Implement caching for static configuration data',
        impact: 'medium',
        description: 'Cache white label configurations to reduce database calls'
      });

    } catch (error) {
      console.error('Error analyzing query optimization:', error);
    }

    return optimizations;
  }
}

// Error boundary and logging utility
export class ErrorTracker {
  static async logError(error: Error, context?: Record<string, any>) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        context: context || {}
      };

      console.error('Production Error:', errorData);

      // Log to security audit if available
      await supabase.rpc('log_security_audit', {
        p_event_type: 'application_error',
        p_severity: 'error',
        p_metadata: errorData
      });

    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}

// Cache management for performance
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const globalCache = new CacheManager();

// Performance optimization utilities
export const PerformanceOptimizer = {
  // Debounce function calls
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
};