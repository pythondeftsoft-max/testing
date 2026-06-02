import React from 'react';
import { ErrorTracker } from '@/utils/productionReadiness';

// Production-ready error boundary component
class ProductionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorTracker.logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. The error has been logged.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ProductionErrorBoundary };

// High-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProductionErrorBoundary>
        <Component {...props} />
      </ProductionErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Context for production monitoring
export const ProductionContext = React.createContext<{
  reportError: (error: Error, context?: Record<string, any>) => void;
  recordMetric: (name: string, value: number, type?: string) => void;
}>({
  reportError: () => {},
  recordMetric: () => {}
});

// Production provider with error tracking and metrics
export const ProductionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    ErrorTracker.logError(error, context);
  }, []);

  const recordMetric = React.useCallback((name: string, value: number, type: string = 'counter') => {
    // This would integrate with the production metrics system
    console.log(`Metric: ${name} = ${value} (${type})`);
  }, []);

  return (
    <ProductionContext.Provider value={{ reportError, recordMetric }}>
      <ProductionErrorBoundary>
        {children}
      </ProductionErrorBoundary>
    </ProductionContext.Provider>
  );
};

// Hook for using production monitoring
export const useProductionMonitoring = () => {
  const context = React.useContext(ProductionContext);
  if (!context) {
    throw new Error('useProductionMonitoring must be used within ProductionProvider');
  }
  return context;
};