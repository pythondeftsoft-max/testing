import { supabase } from '@/integrations/supabase/client';

interface AnalyticsEvent {
  configId: string;
  eventType: string;
  pagePath?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class WhiteLabelAnalyticsTracker {
  private configId: string | null = null;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;
  private lastPageView: number | null = null;
  private pageViewCount = 0;
  private isInitialized = false;

  initialize(configId: string) {
    if (this.isInitialized && this.configId === configId) {
      return; // Already initialized for this config
    }

    this.configId = configId;
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
    this.isInitialized = true;

    console.log('[Analytics] Initialized tracking for config:', configId);

    // Track page view on initialization
    this.trackPageView();

    // Set up page visibility change tracking
    this.setupVisibilityTracking();
  }

  private getOrCreateSessionId(): string {
    const SESSION_KEY = 'wl_session_id';
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

    let sessionData = localStorage.getItem(SESSION_KEY);
    
    if (sessionData) {
      try {
        const { id, timestamp } = JSON.parse(sessionData);
        // Check if session is still valid
        if (Date.now() - timestamp < SESSION_DURATION) {
          return id;
        }
      } catch (e) {
        console.error('[Analytics] Error parsing session data:', e);
      }
    }

    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: newSessionId,
      timestamp: Date.now()
    }));

    return newSessionId;
  }

  private setupVisibilityTracking() {
    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      if (this.sessionStartTime) {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.trackEvent('session_end', {
          sessionDuration,
          pageViews: this.pageViewCount
        });
      }
    });
  }

  trackPageView(pagePath?: string) {
    if (!this.configId || !this.sessionId) {
      console.warn('[Analytics] Tracker not initialized');
      return;
    }

    const path = pagePath || window.location.pathname;
    this.pageViewCount++;
    this.lastPageView = Date.now();

    const loadTime = performance.timing?.loadEventEnd 
      ? performance.timing.loadEventEnd - performance.timing.navigationStart 
      : undefined;

    this.sendEvent({
      configId: this.configId,
      eventType: 'page_view',
      pagePath: path,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata: {
        loadTime,
        page: path,
        pageViews: this.pageViewCount,
        sessionDuration: this.sessionStartTime 
          ? Math.floor((Date.now() - this.sessionStartTime) / 1000)
          : 0
      }
    });

    console.log('[Analytics] Page view tracked:', path);
  }

  trackEvent(eventType: string, metadata?: Record<string, any>) {
    if (!this.configId || !this.sessionId) {
      console.warn('[Analytics] Tracker not initialized');
      return;
    }

    this.sendEvent({
      configId: this.configId,
      eventType,
      pagePath: window.location.pathname,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      metadata
    });

    console.log('[Analytics] Event tracked:', eventType, metadata);
  }

  trackConversion(conversionType: string) {
    this.trackEvent('conversion', {
      conversion: true,
      conversionType
    });
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      const { error } = await supabase.functions.invoke('analytics-collector', {
        body: event
      });

      if (error) {
        console.error('[Analytics] Error sending event:', error);
      }
    } catch (error) {
      console.error('[Analytics] Error invoking analytics function:', error);
    }
  }

  getSessionInfo() {
    return {
      configId: this.configId,
      sessionId: this.sessionId,
      sessionDuration: this.sessionStartTime 
        ? Math.floor((Date.now() - this.sessionStartTime) / 1000)
        : 0,
      pageViews: this.pageViewCount
    };
  }
}

// Create singleton instance
export const analyticsTracker = new WhiteLabelAnalyticsTracker();

// React hook for easy integration
export const useWhiteLabelTracking = (configId: string | null) => {
  if (configId) {
    analyticsTracker.initialize(configId);
  }

  return {
    trackPageView: (path?: string) => analyticsTracker.trackPageView(path),
    trackEvent: (eventType: string, metadata?: Record<string, any>) => 
      analyticsTracker.trackEvent(eventType, metadata),
    trackConversion: (conversionType: string) => 
      analyticsTracker.trackConversion(conversionType),
    getSessionInfo: () => analyticsTracker.getSessionInfo()
  };
};
