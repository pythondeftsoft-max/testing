import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
}

const AnalyticsErrorFallback: React.FC<AnalyticsErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = "Analytics Section"
}) => {
  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title} - Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Unable to load this analytics section. This is an isolated error and other sections should still work.
        </p>
        <div className="space-y-3">
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
          <Button
            variant="outline"
            size="sm"
            onClick={resetErrorBoundary}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Section
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface AnalyticsErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  fallback?: React.ComponentType<AnalyticsErrorFallbackProps>;
}

export const AnalyticsErrorBoundary: React.FC<AnalyticsErrorBoundaryProps> = ({
  children,
  title,
  fallback: FallbackComponent = AnalyticsErrorFallback
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <FallbackComponent {...props} title={title} />
      )}
      onError={(error) => {
        console.error('Analytics section error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Skeleton component for loading states
export const AnalyticsSkeleton: React.FC<{ title?: string; height?: string }> = ({
  title = "Loading Analytics",
  height = "300px"
}) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="bg-muted animate-pulse rounded-lg" 
          style={{ height }}
        />
      </CardContent>
    </Card>
  );
};