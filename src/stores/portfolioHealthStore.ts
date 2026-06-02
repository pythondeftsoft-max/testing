import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface HealthMetric {
  label: string;
  value: number;
  status: 'excellent' | 'good' | 'needs-attention';
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

export interface PortfolioHealthData {
  overallScore: number;
  status: 'excellent' | 'good' | 'needs-attention';
  metrics: HealthMetric[];
  totalUnits: number;
  openMaintenanceRequests: number;
  lastUpdated: Date;
  isLoading: boolean;
}

interface PortfolioHealthStore extends PortfolioHealthData {
  // Animation states
  isAnimating: boolean;
  animationProgress: number;
  
  // Actions
  updateData: (data: Partial<PortfolioHealthData>) => void;
  setLoading: (loading: boolean) => void;
  setAnimating: (animating: boolean) => void;
  setAnimationProgress: (progress: number) => void;
  
  // Computed values
  getHealthColor: () => string;
  getHealthGradient: () => string;
  needsAttention: () => boolean;
}

const getStatusFromScore = (score: number): 'excellent' | 'good' | 'needs-attention' => {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  return 'needs-attention';
};

const getHealthColorFromStatus = (status: string): string => {
  switch (status) {
    case 'excellent': return 'hsl(var(--health-excellent))';
    case 'good': return 'hsl(var(--health-good))';
    case 'needs-attention': return 'hsl(var(--health-attention))';
    default: return 'hsl(var(--muted))';
  }
};

export const usePortfolioHealthStore = create<PortfolioHealthStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    overallScore: 0,
    status: 'needs-attention',
    metrics: [],
    totalUnits: 0,
    openMaintenanceRequests: 0,
    lastUpdated: new Date(),
    isLoading: true,
    isAnimating: false,
    animationProgress: 0,

    // Actions
    updateData: (data) => {
      const currentState = get();
      const newScore = data.overallScore ?? currentState.overallScore;
      const newStatus = getStatusFromScore(newScore);
      
      set({
        ...data,
        overallScore: newScore,
        status: newStatus,
        lastUpdated: new Date(),
      });
    },

    setLoading: (loading) => set({ isLoading: loading }),
    
    setAnimating: (animating) => set({ isAnimating: animating }),
    
    setAnimationProgress: (progress) => set({ animationProgress: progress }),

    // Computed values
    getHealthColor: () => {
      const { status } = get();
      return getHealthColorFromStatus(status);
    },

    getHealthGradient: () => {
      const { status } = get();
      switch (status) {
        case 'excellent':
          return 'linear-gradient(135deg, hsl(var(--health-excellent)), hsl(var(--health-excellent-glow)))';
        case 'good':
          return 'linear-gradient(135deg, hsl(var(--health-good)), hsl(var(--health-good-glow)))';
        case 'needs-attention':
          return 'linear-gradient(135deg, hsl(var(--health-attention)), hsl(var(--health-attention-glow)))';
        default:
          return 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground)))';
      }
    },

    needsAttention: () => {
      const { status } = get();
      return status === 'needs-attention';
    },
  }))
);

// Selector hooks for optimized re-renders
export const useHealthScore = () => usePortfolioHealthStore((state) => state.overallScore);
export const useHealthStatus = () => usePortfolioHealthStore((state) => state.status);
export const useHealthMetrics = () => usePortfolioHealthStore((state) => state.metrics);
export const useAnimationState = () => usePortfolioHealthStore((state) => ({
  isAnimating: state.isAnimating,
  progress: state.animationProgress,
}));