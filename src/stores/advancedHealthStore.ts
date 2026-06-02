import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Subscription } from 'rxjs';
import { portfolioHealthStream, type PortfolioHealthData, type HistoricalDataPoint, type StreamStatus } from '@/streams/portfolioHealthStream';
import type { HealthMetric } from '@/types/analytics';

// Use HealthMetric from types/analytics.ts

export interface AnimationState {
  isAnimating: boolean;
  animationQueue: string[];
  lastUpdate: Date | null;
}

export interface AdvancedPortfolioHealthState {
  // Core data
  currentData: PortfolioHealthData | null;
  historicalData: HistoricalDataPoint[];
  streamStatus: StreamStatus;
  
  // Computed metrics
  overallScore: number;
  metrics: HealthMetric[];
  
  // Animation state
  animation: AnimationState;
  
  // Phase 3: Enhanced UI state
  selectedMetric: string | null;
  isDetailPanelOpen: boolean;
  isFiltersOpen: boolean;
  optimisticUpdates: Record<string, any>;
  
  // Phase 3: Comparative Analysis
  comparativeMode: 'period' | 'benchmark' | 'portfolio';
  timeRange: string;
  benchmarkData: PortfolioHealthData | null;
  
  // Phase 3: Predictive Insights
  insights: any[];
  insightsLoading: boolean;
  
  // Phase 3: Advanced Filters
  activeFilters: {
    propertyTypes: string[];
    locations: string[];
    rentRange: [number, number];
    occupancyRange: [number, number];
    dateRange: string;
    status: string[];
    advanced: {
      hasMaintenanceIssues: boolean;
      hasLatePayments: boolean;
      isNewConstruction: boolean;
      hasParkingSpaces: boolean;
    };
  };
  
  // Actions
  initializeRealTimeStreams: (portfolioId: string) => void;
  disconnectStreams: () => void;
  setSelectedMetric: (metric: string | null) => void;
  toggleDetailPanel: (open?: boolean) => void;
  toggleFiltersPanel: (open?: boolean) => void;
  setComparativeMode: (mode: 'period' | 'benchmark' | 'portfolio') => void;
  setTimeRange: (range: string) => void;
  updateFilters: (filters: any) => void;
  generateInsights: () => void;
  addOptimisticUpdate: (key: string, value: any) => void;
  clearOptimisticUpdate: (key: string) => void;
  setAnimating: (animating: boolean) => void;
  addToAnimationQueue: (animation: string) => void;
  processAnimationQueue: () => void;
  
  // Computed selectors
  getHealthColor: () => string;
  getHealthGradient: () => string;
  needsAttention: () => boolean;
  getTrendDirection: (metric: string) => 'up' | 'down' | 'stable';
  getMetricWithBreakdown: (metricLabel: string) => HealthMetric | null;
}

export const useAdvancedHealthStore = create<AdvancedPortfolioHealthState>()(
  subscribeWithSelector((set, get) => {
    let dataSubscription: Subscription | null = null;
    let historySubscription: Subscription | null = null;
    let statusSubscription: Subscription | null = null;
    let trendsSubscription: Subscription | null = null;

    return {
      // Initial state
      currentData: null,
      historicalData: [],
      streamStatus: {
        connected: false,
        lastUpdate: null,
        errorCount: 0,
        latency: 0
      },
      overallScore: 0,
      metrics: [],
      animation: {
        isAnimating: false,
        animationQueue: [],
        lastUpdate: null
      },
      selectedMetric: null,
      isDetailPanelOpen: false,
      isFiltersOpen: false,
      optimisticUpdates: {},
      
      // Phase 3: Comparative Analysis
      comparativeMode: 'period',
      timeRange: '30d',
      benchmarkData: null,
      
      // Phase 3: Predictive Insights
      insights: [],
      insightsLoading: false,
      
      // Phase 3: Advanced Filters
      activeFilters: {
        propertyTypes: [],
        locations: [],
        rentRange: [500, 5000],
        occupancyRange: [0, 100],
        dateRange: '30d',
        status: [],
        advanced: {
          hasMaintenanceIssues: false,
          hasLatePayments: false,
          isNewConstruction: false,
          hasParkingSpaces: false,
        }
      },

      // Actions
      initializeRealTimeStreams: (portfolioId: string) => {
        const state = get();
        
        // Clean up existing subscriptions
        if (dataSubscription) dataSubscription.unsubscribe();
        if (historySubscription) historySubscription.unsubscribe();
        if (statusSubscription) statusSubscription.unsubscribe();
        if (trendsSubscription) trendsSubscription.unsubscribe();

        // Set portfolio ID and start streams
        portfolioHealthStream.setPortfolioId(portfolioId);

        // Subscribe to health data
        dataSubscription = portfolioHealthStream.healthData$.subscribe(data => {
          set(state => {
            const metrics = calculateMetrics(data);
            const overallScore = calculateOverallScore(metrics);
            
            return {
              currentData: data,
              metrics,
              overallScore,
              animation: {
                ...state.animation,
                lastUpdate: new Date()
              }
            };
          });
        });

        // Subscribe to historical data
        historySubscription = portfolioHealthStream.historicalData$.subscribe(history => {
          set({ historicalData: history });
        });

        // Subscribe to connection status
        statusSubscription = portfolioHealthStream.status$.subscribe(status => {
          set({ streamStatus: status });
        });

        // Subscribe to trends
        trendsSubscription = portfolioHealthStream.trends$.subscribe(trends => {
          if (trends) {
            set(state => ({
              metrics: state.metrics.map(metric => ({
                ...metric,
                trend: getTrendForMetric(metric.label, trends)
              }))
            }));
          }
        });
      },

      disconnectStreams: () => {
        if (dataSubscription) dataSubscription.unsubscribe();
        if (historySubscription) historySubscription.unsubscribe();
        if (statusSubscription) statusSubscription.unsubscribe();
        if (trendsSubscription) trendsSubscription.unsubscribe();
        
        portfolioHealthStream.disconnect();
        
        set({
          streamStatus: {
            connected: false,
            lastUpdate: null,
            errorCount: 0,
            latency: 0
          }
        });
      },

      setSelectedMetric: (metric: string | null) => {
        set({ selectedMetric: metric });
      },

      toggleDetailPanel: (open?: boolean) => {
        set(state => ({
          isDetailPanelOpen: open !== undefined ? open : !state.isDetailPanelOpen
        }));
      },

      // Phase 3: Enhanced UI Actions
      toggleFiltersPanel: (open?: boolean) => {
        set(state => ({
          isFiltersOpen: open !== undefined ? open : !state.isFiltersOpen
        }));
      },

      setComparativeMode: (mode: 'period' | 'benchmark' | 'portfolio') => {
        set({ comparativeMode: mode });
      },

      setTimeRange: (range: string) => {
        set({ timeRange: range });
      },

      updateFilters: (newFilters: any) => {
        set(state => ({
          activeFilters: { ...state.activeFilters, ...newFilters }
        }));
      },

      generateInsights: () => {
        set({ insightsLoading: true });
        
        // Simulate AI insight generation
        setTimeout(() => {
          const insights = [
            {
              id: '1',
              type: 'prediction',
              title: 'Occupancy Rate Forecast',
              description: 'Predicted 3.2% increase next quarter based on trends',
              confidence: 87,
              impact: 'high',
              timeframe: 'Next 3 months',
              metric: 'Occupancy Rate',
              predictedValue: 90.2,
              currentValue: 87,
              trend: 3.2,
              priority: 1
            },
            {
              id: '2',
              type: 'alert',
              title: 'Maintenance Cost Alert',
              description: 'Potential 15% increase in maintenance costs detected',
              confidence: 73,
              impact: 'medium',
              timeframe: 'Next 2 months',
              metric: 'Maintenance Resolution',
              predictedValue: 4.2,
              currentValue: 3.0,
              trend: -15,
              priority: 2
            }
          ];
          
          set({ 
            insights,
            insightsLoading: false 
          });
        }, 1000);
      },

      addOptimisticUpdate: (key: string, value: any) => {
        set(state => ({
          optimisticUpdates: {
            ...state.optimisticUpdates,
            [key]: value
          }
        }));
      },

      clearOptimisticUpdate: (key: string) => {
        set(state => {
          const updates = { ...state.optimisticUpdates };
          delete updates[key];
          return { optimisticUpdates: updates };
        });
      },

      setAnimating: (animating: boolean) => {
        set(state => ({
          animation: {
            ...state.animation,
            isAnimating: animating
          }
        }));
      },

      addToAnimationQueue: (animation: string) => {
        set(state => ({
          animation: {
            ...state.animation,
            animationQueue: [...state.animation.animationQueue, animation]
          }
        }));
      },

      processAnimationQueue: () => {
        const state = get();
        if (state.animation.animationQueue.length > 0) {
          const [nextAnimation, ...remaining] = state.animation.animationQueue;
          set(state => ({
            animation: {
              ...state.animation,
              animationQueue: remaining
            }
          }));
          // Process the animation (could trigger UI updates)
        }
      },

      // Computed selectors
      getHealthColor: () => {
        const { overallScore } = get();
        // Add fallback colors if CSS variables are not defined
        if (overallScore >= 85) return 'hsl(var(--health-excellent, 142 71% 45%))'; // green fallback
        if (overallScore >= 70) return 'hsl(var(--health-good, 220 100% 45%))'; // blue fallback 
        return 'hsl(var(--health-needs-attention, 0 84% 60%))'; // red fallback
      },

      getHealthGradient: () => {
        const { overallScore } = get();
        if (overallScore >= 85) return 'var(--gradient-health-excellent)';
        if (overallScore >= 70) return 'var(--gradient-health-good)';
        return 'var(--gradient-health-needs-attention)';
      },

      needsAttention: () => {
        const { overallScore } = get();
        return overallScore < 70;
      },

      getTrendDirection: (metric: string) => {
        const { metrics } = get();
        const foundMetric = metrics.find(m => m.label === metric);
        if (!foundMetric) return 'stable';
        
        if (foundMetric.trend > 2) return 'up';
        if (foundMetric.trend < -2) return 'down';
        return 'stable';
      },

      // Phase 3: Enhanced metric data with breakdown
      getMetricWithBreakdown: (metricLabel: string) => {
        const { metrics } = get();
        const metric = metrics.find(m => m.label === metricLabel);
        if (!metric) return null;

        // Keep the original metric structure for now
        return metric;
      }
    };
  })
);

// Helper functions
function calculateMetrics(data: PortfolioHealthData): HealthMetric[] {
  return [
    {
      label: 'Occupancy',
      value: data.occupancyRate,
      status: data.occupancyRate >= 90 ? 'excellent' : data.occupancyRate >= 80 ? 'good' : 'needs-attention',
      color: data.occupancyRate >= 90 ? 'hsl(var(--health-excellent))' : data.occupancyRate >= 80 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
      trend: 0,
      icon: 'home'
    },
    {
      label: 'Financial',
      value: data.collectionRate,
      status: data.collectionRate >= 95 ? 'excellent' : data.collectionRate >= 85 ? 'good' : 'needs-attention',
      color: data.collectionRate >= 95 ? 'hsl(var(--health-excellent))' : data.collectionRate >= 85 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
      trend: 0,
      icon: 'dollar-sign'
    },
    {
      label: 'Maintenance',
      value: 100 - (data.averageMaintenanceResolutionDays * 10), // Convert to positive score
      status: data.averageMaintenanceResolutionDays <= 2 ? 'excellent' : data.averageMaintenanceResolutionDays <= 5 ? 'good' : 'needs-attention',
      color: data.averageMaintenanceResolutionDays <= 2 ? 'hsl(var(--health-excellent))' : data.averageMaintenanceResolutionDays <= 5 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
      trend: 0,
      icon: 'wrench'
    },
    {
      label: 'Tenant Relations',
      value: data.onTimePaymentRate,
      status: data.onTimePaymentRate >= 95 ? 'excellent' : data.onTimePaymentRate >= 85 ? 'good' : 'needs-attention',
      color: data.onTimePaymentRate >= 95 ? 'hsl(var(--health-excellent))' : data.onTimePaymentRate >= 85 ? 'hsl(var(--health-good))' : 'hsl(var(--health-needs-attention))',
      trend: 0,
      icon: 'users'
    }
  ];
}

function calculateOverallScore(metrics: HealthMetric[]): number {
  const weights = [0.3, 0.3, 0.2, 0.2]; // Occupancy, Financial, Maintenance, Tenant Relations
  let totalScore = 0;
  
  metrics.forEach((metric, index) => {
    totalScore += metric.value * weights[index];
  });
  
  return Math.round(totalScore);
}

function getTrendForMetric(label: string, trends: any): number {
  switch (label) {
    case 'Occupancy':
      return trends.occupancyRate || 0;
    case 'Financial':
      return trends.collectionRate || 0;
    case 'Maintenance':
      return trends.maintenanceResolution || 0;
    case 'Tenant Relations':
      return trends.onTimePayment || 0;
    default:
      return 0;
  }
}

// Generate category breakdown for detailed analysis
function generateCategoryBreakdown(metricLabel: string, value: number) {
  switch (metricLabel) {
    case 'Occupancy':
      return [
        { name: 'Studio Units', value: value * 0.2, percentage: 20, trend: 2.1 },
        { name: '1 Bedroom', value: value * 0.35, percentage: 35, trend: 1.8 },
        { name: '2 Bedroom', value: value * 0.3, percentage: 30, trend: -0.5 },
        { name: '3+ Bedroom', value: value * 0.15, percentage: 15, trend: 3.2 }
      ];
    case 'Financial':
      return [
        { name: 'On-Time Payments', value: value * 0.8, percentage: 80, trend: 1.2 },
        { name: 'Late Payments', value: value * 0.15, percentage: 15, trend: -2.1 },
        { name: 'Partial Payments', value: value * 0.05, percentage: 5, trend: 0.3 }
      ];
    case 'Maintenance':
      return [
        { name: 'Emergency Repairs', value: 95, percentage: 25, trend: -1.5 },
        { name: 'Routine Maintenance', value: 85, percentage: 40, trend: 2.1 },
        { name: 'Preventive Care', value: 92, percentage: 35, trend: 1.8 }
      ];
    case 'Tenant Relations':
      return [
        { name: 'Lease Renewals', value: value * 0.85, percentage: 85, trend: 2.5 },
        { name: 'Complaint Resolution', value: value * 0.9, percentage: 90, trend: 1.1 },
        { name: 'Satisfaction Score', value: value * 0.8, percentage: 80, trend: 0.8 }
      ];
    default:
      return [];
  }
}

// Optimized selectors for specific data
export const useRealtimeHealthData = () => useAdvancedHealthStore(state => state.currentData);
export const useHealthScore = () => useAdvancedHealthStore(state => state.overallScore);
export const useHealthMetrics = () => useAdvancedHealthStore(state => state.metrics);
export const useStreamStatus = () => useAdvancedHealthStore(state => state.streamStatus);
export const useAnimationState = () => useAdvancedHealthStore(state => state.animation);
export const useHistoricalData = () => useAdvancedHealthStore(state => state.historicalData);