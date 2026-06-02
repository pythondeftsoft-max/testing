import { Observable, BehaviorSubject, combineLatest, merge, EMPTY, of } from 'rxjs';
import { 
  map, 
  filter, 
  debounceTime, 
  distinctUntilChanged, 
  shareReplay, 
  catchError, 
  retry, 
  switchMap,
  startWith,
  scan,
  tap
} from 'rxjs/operators';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface PortfolioHealthData {
  occupancyRate: number;
  collectionRate: number;
  averageMaintenanceResolutionDays: number;
  onTimePaymentRate: number;
  openMaintenanceRequests: number;
  totalUnits: number;
  timestamp: Date;
}

export interface HistoricalDataPoint extends PortfolioHealthData {
  id: string;
}

export interface StreamStatus {
  connected: boolean;
  lastUpdate: Date | null;
  errorCount: number;
  latency: number;
}

class PortfolioHealthStream {
  private portfolioId$ = new BehaviorSubject<string | null>(null);
  private connectionStatus$ = new BehaviorSubject<StreamStatus>({
    connected: false,
    lastUpdate: null,
    errorCount: 0,
    latency: 0
  });

  private channel: any = null;
  private startTime = 0;

  // Create the main health data stream
  public healthData$: Observable<PortfolioHealthData> = this.portfolioId$.pipe(
    filter(id => id !== null),
    switchMap(portfolioId => this.createRealtimeStream(portfolioId!)),
    debounceTime(100), // Prevent rapid-fire updates
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    tap(() => this.updateConnectionStatus(true)),
    catchError(error => {
      console.error('Portfolio health stream error:', error);
      this.updateConnectionStatus(false, error);
      return EMPTY;
    }),
    retry({ delay: 1000, count: 3 }),
    shareReplay(1)
  );

  // Historical data buffer for trends
  public historicalData$: Observable<HistoricalDataPoint[]> = this.healthData$.pipe(
    scan((history: HistoricalDataPoint[], current: PortfolioHealthData) => {
      const newPoint: HistoricalDataPoint = {
        ...current,
        id: crypto.randomUUID()
      };
      
      // Keep last 50 data points
      const updatedHistory = [...history, newPoint].slice(-50);
      return updatedHistory;
    }, []),
    shareReplay(1)
  );

  // Connection status stream
  public status$ = this.connectionStatus$.asObservable().pipe(
    shareReplay(1)
  );

  // Trend calculations
  public trends$ = this.historicalData$.pipe(
    map(history => {
      if (history.length < 2) return null;
      
      const recent = history.slice(-5);
      const older = history.slice(-10, -5);
      
      if (older.length === 0) return null;

      const recentAvg = {
        occupancyRate: recent.reduce((sum, p) => sum + p.occupancyRate, 0) / recent.length,
        collectionRate: recent.reduce((sum, p) => sum + p.collectionRate, 0) / recent.length,
        maintenanceResolution: recent.reduce((sum, p) => sum + p.averageMaintenanceResolutionDays, 0) / recent.length,
        onTimePayment: recent.reduce((sum, p) => sum + p.onTimePaymentRate, 0) / recent.length
      };

      const olderAvg = {
        occupancyRate: older.reduce((sum, p) => sum + p.occupancyRate, 0) / older.length,
        collectionRate: older.reduce((sum, p) => sum + p.collectionRate, 0) / older.length,
        maintenanceResolution: older.reduce((sum, p) => sum + p.averageMaintenanceResolutionDays, 0) / older.length,
        onTimePayment: older.reduce((sum, p) => sum + p.onTimePaymentRate, 0) / older.length
      };

      return {
        occupancyRate: recentAvg.occupancyRate - olderAvg.occupancyRate,
        collectionRate: recentAvg.collectionRate - olderAvg.collectionRate,
        maintenanceResolution: olderAvg.maintenanceResolution - recentAvg.maintenanceResolution, // Lower is better
        onTimePayment: recentAvg.onTimePayment - olderAvg.onTimePayment
      };
    }),
    shareReplay(1)
  );

  private createRealtimeStream(portfolioId: string): Observable<PortfolioHealthData> {
    return new Observable(subscriber => {
      this.startTime = Date.now();
      
      // Subscribe to real-time changes
      this.channel = supabase
        .channel(`portfolio_health_${portfolioId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'properties',
            filter: `portfolio_id=eq.${portfolioId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleRealtimeUpdate(portfolioId, payload, subscriber);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rent_payments',
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleRealtimeUpdate(portfolioId, payload, subscriber);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests',
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleRealtimeUpdate(portfolioId, payload, subscriber);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.fetchInitialData(portfolioId, subscriber);
          }
        });

      // Cleanup function
      return () => {
        if (this.channel) {
          supabase.removeChannel(this.channel);
          this.channel = null;
        }
      };
    });
  }

  private async handleRealtimeUpdate(
    portfolioId: string, 
    payload: RealtimePostgresChangesPayload<any>,
    subscriber: any
  ) {
    try {
      const latency = Date.now() - this.startTime;
      this.updateConnectionStatus(true, null, latency);
      
      // Debounce rapid updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await this.fetchInitialData(portfolioId, subscriber);
    } catch (error) {
      console.error('Error handling realtime update:', error);
      this.updateConnectionStatus(false, error);
    }
  }

  private async fetchInitialData(portfolioId: string, subscriber: any) {
    try {
      // Simulate fetching portfolio health data
      // In real implementation, this would fetch from multiple tables
      const mockData: PortfolioHealthData = {
        occupancyRate: 85 + Math.random() * 10,
        collectionRate: 92 + Math.random() * 6,
        averageMaintenanceResolutionDays: 2 + Math.random() * 3,
        onTimePaymentRate: 88 + Math.random() * 8,
        openMaintenanceRequests: Math.floor(5 + Math.random() * 10),
        totalUnits: 150 + Math.floor(Math.random() * 20),
        timestamp: new Date()
      };

      subscriber.next(mockData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      subscriber.error(error);
    }
  }

  private updateConnectionStatus(connected: boolean, error?: any, latency = 0) {
    const currentStatus = this.connectionStatus$.value;
    this.connectionStatus$.next({
      connected,
      lastUpdate: connected ? new Date() : currentStatus.lastUpdate,
      errorCount: error ? currentStatus.errorCount + 1 : currentStatus.errorCount,
      latency
    });
  }

  public setPortfolioId(portfolioId: string) {
    this.portfolioId$.next(portfolioId);
  }

  public disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.portfolioId$.next(null);
    this.updateConnectionStatus(false);
  }

  public getLatestData(): PortfolioHealthData | null {
    // Get the latest cached value
    return null; // Would need to implement caching
  }
}

// Export singleton instance
export const portfolioHealthStream = new PortfolioHealthStream();
