import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  bundleSize?: number;
  cacheHitRate: number;
  apiResponseTimes: Record<string, number>;
  errorCount: number;
  userInteractions: number;
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

interface PerformanceMonitorOptions {
  enableMemoryTracking?: boolean;
  enableRenderTracking?: boolean;
  enableApiTracking?: boolean;
  alertThresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    apiResponseTime?: number;
    errorRate?: number;
  };
  onAlert?: (alert: PerformanceAlert) => void;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  startMeasure: (name: string) => void;
  endMeasure: (name: string) => number | null;
  trackApiCall: (endpoint: string, responseTime: number) => void;
  trackError: (error: Error | string) => void;
  trackUserInteraction: (action: string) => void;
  clearMetrics: () => void;
  exportMetrics: () => string;
}

const usePerformanceMonitor = (
  options: PerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn => {
  const {
    enableMemoryTracking = true,
    enableRenderTracking = true,
    enableApiTracking = true,
    alertThresholds = {
      renderTime: 100,
      memoryUsage: 100 * 1024 * 1024, // 100MB
      apiResponseTime: 1000,
      errorRate: 0.05 // 5%
    },
    onAlert
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiResponseTimes: {},
    errorCount: 0,
    userInteractions: 0
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const measurementsRef = useRef<Record<string, number>>({});
  const renderStartRef = useRef<number>(0);
  const apiCallsRef = useRef<Record<string, number[]>>({});
  const totalRequestsRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const cacheHitsRef = useRef<number>(0);
  const cacheMissesRef = useRef<number>(0);

  // Performance observer for Core Web Vitals
  useEffect(() => {
    if (!enableRenderTracking || typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          const renderTime = entry.duration;
          
          setMetrics(prev => ({
            ...prev,
            renderTime: Math.max(prev.renderTime, renderTime)
          }));

          // Check alert threshold
          if (alertThresholds.renderTime && renderTime > alertThresholds.renderTime) {
            const alert: PerformanceAlert = {
              type: 'warning',
              message: `Slow render detected: ${renderTime.toFixed(2)}ms`,
              metric: 'renderTime',
              value: renderTime,
              threshold: alertThresholds.renderTime,
              timestamp: Date.now()
            };
            
            setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
            onAlert?.(alert);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });

    return () => observer.disconnect();
  }, [enableRenderTracking, alertThresholds.renderTime, onAlert]);

  // Memory usage tracking
  useEffect(() => {
    if (!enableMemoryTracking || typeof window === 'undefined' || !('memory' in performance)) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize;
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage
        }));

        // Check alert threshold
        if (alertThresholds.memoryUsage && memoryUsage > alertThresholds.memoryUsage) {
          const alert: PerformanceAlert = {
            type: 'warning',
            message: `High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
            metric: 'memoryUsage',
            value: memoryUsage,
            threshold: alertThresholds.memoryUsage,
            timestamp: Date.now()
          };
          
          setAlerts(prev => [...prev.slice(-9), alert]);
          onAlert?.(alert);
        }
      }
    };

    const interval = setInterval(updateMemoryUsage, 60000); // Check every 60 seconds
    updateMemoryUsage(); // Initial check

    return () => clearInterval(interval);
  }, [enableMemoryTracking, alertThresholds.memoryUsage, onAlert]);

  // Component count tracking
  useEffect(() => {
    const updateComponentCount = () => {
      // Count React components in the DOM (simplified heuristic)
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-*]');
      setMetrics(prev => ({
        ...prev,
        componentCount: reactElements.length
      }));
    };

    updateComponentCount();
    const observer = new MutationObserver(updateComponentCount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // Cache hit rate calculation
  useEffect(() => {
    const updateCacheHitRate = () => {
      const total = cacheHitsRef.current + cacheMissesRef.current;
      const rate = total > 0 ? cacheHitsRef.current / total : 0;
      
      setMetrics(prev => ({
        ...prev,
        cacheHitRate: rate
      }));
    };

    const interval = setInterval(updateCacheHitRate, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const startMeasure = useCallback((name: string) => {
    measurementsRef.current[name] = performance.now();
  }, []);

  const endMeasure = useCallback((name: string): number | null => {
    const startTime = measurementsRef.current[name];
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    delete measurementsRef.current[name];

    // Mark performance measure for PerformanceObserver
    if (typeof window !== 'undefined' && performance.mark) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, { start: startTime, end: performance.now() });
      } catch (error) {
        // Silently handle performance API errors
      }
    }

    return duration;
  }, []);

  const trackApiCall = useCallback((endpoint: string, responseTime: number) => {
    if (!enableApiTracking) return;

    totalRequestsRef.current++;
    
    if (!apiCallsRef.current[endpoint]) {
      apiCallsRef.current[endpoint] = [];
    }
    
    apiCallsRef.current[endpoint].push(responseTime);
    
    // Keep only last 100 calls per endpoint
    if (apiCallsRef.current[endpoint].length > 100) {
      apiCallsRef.current[endpoint] = apiCallsRef.current[endpoint].slice(-100);
    }

    // Calculate average response time for this endpoint
    const calls = apiCallsRef.current[endpoint];
    const avgResponseTime = calls.reduce((sum, time) => sum + time, 0) / calls.length;

    setMetrics(prev => ({
      ...prev,
      apiResponseTimes: {
        ...prev.apiResponseTimes,
        [endpoint]: avgResponseTime
      }
    }));

    // Check alert threshold
    if (alertThresholds.apiResponseTime && responseTime > alertThresholds.apiResponseTime) {
      const alert: PerformanceAlert = {
        type: 'warning',
        message: `Slow API response: ${endpoint} took ${responseTime.toFixed(0)}ms`,
        metric: 'apiResponseTime',
        value: responseTime,
        threshold: alertThresholds.apiResponseTime,
        timestamp: Date.now()
      };
      
      setAlerts(prev => [...prev.slice(-9), alert]);
      onAlert?.(alert);
    }
  }, [enableApiTracking, alertThresholds.apiResponseTime, onAlert]);

  const trackError = useCallback((error: Error | string) => {
    errorCountRef.current++;
    
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    // Calculate error rate
    const errorRate = errorCountRef.current / Math.max(totalRequestsRef.current, 1);
    
    if (alertThresholds.errorRate && errorRate > alertThresholds.errorRate) {
      const alert: PerformanceAlert = {
        type: 'error',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        metric: 'errorRate',
        value: errorRate,
        threshold: alertThresholds.errorRate,
        timestamp: Date.now()
      };
      
      setAlerts(prev => [...prev.slice(-9), alert]);
      onAlert?.(alert);
    }

    // Log error details for debugging
    console.warn('Performance Monitor - Error tracked:', error);
  }, [alertThresholds.errorRate, onAlert]);

  const trackUserInteraction = useCallback((action: string) => {
    setMetrics(prev => ({
      ...prev,
      userInteractions: prev.userInteractions + 1
    }));

    // Track interaction timing
    startMeasure(`interaction-${action}`);
    
    // Use requestIdleCallback to measure when interaction is complete
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        endMeasure(`interaction-${action}`);
      });
    }
  }, [startMeasure, endMeasure]);

  const clearMetrics = useCallback(() => {
    setMetrics({
      renderTime: 0,
      componentCount: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      apiResponseTimes: {},
      errorCount: 0,
      userInteractions: 0
    });
    
    setAlerts([]);
    measurementsRef.current = {};
    apiCallsRef.current = {};
    totalRequestsRef.current = 0;
    errorCountRef.current = 0;
    cacheHitsRef.current = 0;
    cacheMissesRef.current = 0;
  }, []);

  const exportMetrics = useCallback((): string => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      alerts,
      summary: {
        avgApiResponseTime: Object.values(metrics.apiResponseTimes).reduce((sum, time) => sum + time, 0) / Object.keys(metrics.apiResponseTimes).length || 0,
        errorRate: metrics.errorCount / Math.max(totalRequestsRef.current, 1),
        cacheEfficiency: metrics.cacheHitRate,
        performanceScore: calculatePerformanceScore()
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [metrics, alerts]);

  const calculatePerformanceScore = useCallback((): number => {
    let score = 100;
    
    // Deduct points for poor performance
    if (metrics.renderTime > 100) score -= 20;
    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) score -= 15;
    if (Object.values(metrics.apiResponseTimes).some(time => time > 1000)) score -= 25;
    if (metrics.errorCount > 0) score -= metrics.errorCount * 5;
    if (metrics.cacheHitRate < 0.8) score -= 20;
    
    return Math.max(0, score);
  }, [metrics]);

  // Cache tracking integration
  const trackCacheHit = useCallback(() => {
    cacheHitsRef.current++;
  }, []);

  const trackCacheMiss = useCallback(() => {
    cacheMissesRef.current++;
  }, []);

  // Enhanced return object with cache tracking
  return {
    metrics: {
      ...metrics,
      performanceScore: calculatePerformanceScore()
    },
    alerts,
    startMeasure,
    endMeasure,
    trackApiCall,
    trackError,
    trackUserInteraction,
    clearMetrics,
    exportMetrics,
    // Additional cache tracking methods
    trackCacheHit,
    trackCacheMiss
  } as UsePerformanceMonitorReturn & {
    trackCacheHit: () => void;
    trackCacheMiss: () => void;
  };
};

export default usePerformanceMonitor;
