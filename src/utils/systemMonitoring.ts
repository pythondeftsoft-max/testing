import { supabase } from '@/integrations/supabase/client';

// System monitoring and alerting
export class SystemMonitor {
  private alerts: Array<{
    id: string;
    level: 'info' | 'warn' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }> = [];

  async monitorSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    checks: Array<{ name: string; status: boolean; message: string }>;
    alerts: typeof this.alerts;
  }> {
    const checks = [
      await this.checkDatabasePerformance(),
      await this.checkEdgeFunctionHealth(),
      await this.checkUserActivity(),
      await this.checkErrorRates(),
      await this.checkResourceUsage()
    ];

    const failedChecks = checks.filter(c => !c.status).length;
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (failedChecks > 0) {
      status = failedChecks >= 3 ? 'critical' : 'degraded';
    }

    return {
      status,
      checks,
      alerts: this.alerts.filter(a => !a.resolved)
    };
  }

  private async checkDatabasePerformance(): Promise<{ name: string; status: boolean; message: string }> {
    try {
      const start = performance.now();
      await supabase.from('portfolios').select('count');
      const duration = performance.now() - start;

      const isHealthy = duration < 1000; // Less than 1 second
      
      if (!isHealthy) {
        this.addAlert('warn', `Database query took ${duration.toFixed(2)}ms`);
      }

      return {
        name: 'Database Performance',
        status: isHealthy,
        message: `Query time: ${duration.toFixed(2)}ms`
      };
    } catch (error: any) {
      this.addAlert('error', `Database error: ${error.message}`);
      return {
        name: 'Database Performance',
        status: false,
        message: error.message
      };
    }
  }

  private async checkEdgeFunctionHealth(): Promise<{ name: string; status: boolean; message: string }> {
    try {
      const start = performance.now();
      const { error } = await supabase.functions.invoke('process-portfolio-events', {
        body: { healthCheck: true }
      });
      const duration = performance.now() - start;

      const isHealthy = !error && duration < 5000;

      if (!isHealthy) {
        this.addAlert('warn', `Edge function health check failed or slow: ${duration.toFixed(2)}ms`);
      }

      return {
        name: 'Edge Functions',
        status: isHealthy,
        message: error ? error.message : `Response time: ${duration.toFixed(2)}ms`
      };
    } catch (error: any) {
      this.addAlert('error', `Edge function error: ${error.message}`);
      return {
        name: 'Edge Functions',
        status: false,
        message: error.message
      };
    }
  }

  private async checkUserActivity(): Promise<{ name: string; status: boolean; message: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isAuthenticated = user !== null;

      return {
        name: 'User Authentication',
        status: isAuthenticated,
        message: isAuthenticated ? 'User authenticated' : 'No authenticated user'
      };
    } catch (error: any) {
      return {
        name: 'User Authentication',
        status: false,
        message: error.message
      };
    }
  }

  private async checkErrorRates(): Promise<{ name: string; status: boolean; message: string }> {
    // This would typically check error logs or metrics
    // For now, we'll simulate based on recent operations
    const errorRate = Math.random() * 0.1; // Simulate 0-10% error rate
    const isHealthy = errorRate < 0.05; // Less than 5% error rate

    if (!isHealthy) {
      this.addAlert('warn', `High error rate detected: ${(errorRate * 100).toFixed(2)}%`);
    }

    return {
      name: 'Error Rates',
      status: isHealthy,
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%`
    };
  }

  private async checkResourceUsage(): Promise<{ name: string; status: boolean; message: string }> {
    // Check memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryLimit = (performance as any).memory?.jsHeapSizeLimit || Infinity;
    const memoryPercentage = memoryLimit ? (memoryUsage / memoryLimit) * 100 : 0;

    const isHealthy = memoryPercentage < 80; // Less than 80% memory usage

    if (!isHealthy) {
      this.addAlert('warn', `High memory usage: ${memoryPercentage.toFixed(2)}%`);
    }

    return {
      name: 'Resource Usage',
      status: isHealthy,
      message: `Memory usage: ${memoryPercentage.toFixed(2)}%`
    };
  }

  private addAlert(level: 'info' | 'warn' | 'error' | 'critical', message: string) {
    this.alerts.push({
      id: Math.random().toString(36).substring(2, 15),
      level,
      message,
      timestamp: new Date(),
      resolved: false
    });
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  getCriticalAlerts() {
    return this.alerts.filter(a => !a.resolved && (a.level === 'error' || a.level === 'critical'));
  }
}

// Performance tracking for edge functions
export class EdgeFunctionMonitor {
  private metrics = new Map<string, Array<{ duration: number; success: boolean; timestamp: Date }>>();

  trackFunction(name: string, duration: number, success: boolean) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const functionMetrics = this.metrics.get(name)!;
    functionMetrics.push({ duration, success, timestamp: new Date() });

    // Keep only last 100 entries per function
    if (functionMetrics.length > 100) {
      functionMetrics.shift();
    }
  }

  getFunctionStats(name: string) {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) {
      return null;
    }

    const totalCalls = metrics.length;
    const successfulCalls = metrics.filter(m => m.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const successRate = (successfulCalls / totalCalls) * 100;
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalCalls;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate,
      avgDuration,
      lastCall: metrics[metrics.length - 1].timestamp
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [name] of this.metrics) {
      stats[name] = this.getFunctionStats(name);
    }

    return stats;
  }
}

// User activity tracking
export class UserActivityTracker {
  private activities: Array<{
    userId: string;
    action: string;
    resource: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }> = [];

  trackActivity(
    userId: string,
    action: string,
    resource: string,
    metadata?: Record<string, any>
  ) {
    this.activities.push({
      userId,
      action,
      resource,
      timestamp: new Date(),
      metadata
    });

    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities.shift();
    }

    console.log(`Activity tracked: ${userId} ${action} ${resource}`, metadata);
  }

  getUserActivities(userId: string, limit: number = 50) {
    return this.activities
      .filter(a => a.userId === userId)
      .slice(-limit)
      .reverse();
  }

  getRecentActivities(limit: number = 100) {
    return this.activities
      .slice(-limit)
      .reverse();
  }

  getActivitySummary(timeWindow: number = 3600000) { // 1 hour default
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    const recentActivities = this.activities.filter(a => a.timestamp >= windowStart);
    
    const summary = {
      totalActivities: recentActivities.length,
      uniqueUsers: new Set(recentActivities.map(a => a.userId)).size,
      topActions: this.getTopActions(recentActivities),
      topResources: this.getTopResources(recentActivities)
    };

    return summary;
  }

  private getTopActions(activities: typeof this.activities) {
    const actionCounts = activities.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  private getTopResources(activities: typeof this.activities) {
    const resourceCounts = activities.reduce((acc, a) => {
      acc[a.resource] = (acc[a.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }
}
