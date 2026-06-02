import React, { Suspense, lazy, ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyComponentLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  skeleton?: 'card' | 'table' | 'chart' | 'list' | 'dashboard';
  className?: string;
}

// Skeleton components for different content types
const SkeletonCard = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonTable = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="border rounded-lg">
      <div className="border-b p-4">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b last:border-b-0 p-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonChart = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="h-64 bg-muted rounded-lg flex items-end justify-center gap-2 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-8 bg-muted-foreground/20" 
              style={{ height: `${Math.random() * 100 + 40}%` }}
            />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonList = () => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

const SkeletonDashboard = () => (
  <div className="animate-pulse space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Metrics Grid */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Charts Grid */}
    <div className="grid gap-4 md:grid-cols-2">
      <SkeletonChart />
      <SkeletonChart />
    </div>
  </div>
);

const DefaultLoader = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="flex items-center justify-center py-12"
  >
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </motion.div>
);

const LazyComponentLoader: React.FC<LazyComponentLoaderProps> = ({
  children,
  fallback,
  skeleton = 'card',
  className
}) => {
  const skeletonComponents = {
    card: <SkeletonCard />,
    table: <SkeletonTable />,
    chart: <SkeletonChart />,
    list: <SkeletonList />,
    dashboard: <SkeletonDashboard />
  };

  const defaultFallback = fallback || skeletonComponents[skeleton] || <DefaultLoader />;

  return (
    <div className={className}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </div>
  );
};

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <T extends object>(
  Component: ComponentType<T>,
  skeletonType: 'card' | 'table' | 'chart' | 'list' | 'dashboard' = 'card'
) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return (props: T) => (
    <LazyComponentLoader skeleton={skeletonType}>
      <LazyComponent {...(props as any)} />
    </LazyComponentLoader>
  );
};

// Performance-optimized lazy loading with preloading
export const createLazyComponent = <T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    preload?: boolean;
    skeleton?: 'card' | 'table' | 'chart' | 'list' | 'dashboard';
    retryCount?: number;
  } = {}
) => {
  const { preload = false, skeleton = 'card', retryCount = 3 } = options;
  
  // Create lazy component with retry logic
  const LazyComponent = lazy(() => {
    let attempts = 0;
    
    const loadWithRetry = async (): Promise<{ default: ComponentType<T> }> => {
      try {
        return await importFn();
      } catch (error) {
        attempts++;
        if (attempts < retryCount) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          return loadWithRetry();
        }
        throw error;
      }
    };
    
    return loadWithRetry();
  });
  
  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Preload on next tick to avoid blocking initial render
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    }, 0);
  }
  
  const WrappedComponent = (props: T) => (
    <LazyComponentLoader skeleton={skeleton}>
      <LazyComponent {...(props as any)} />
    </LazyComponentLoader>
  );
  
  return WrappedComponent;
};

// Hook for intersection-based lazy loading
export const useIntersectionLazyLoad = (options: IntersectionObserverInit = {}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return { ref, isVisible };
};

export default LazyComponentLoader;