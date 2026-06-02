import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhiteLabelErrorHandlerProps {
  error?: Error | null;
  fallback?: React.ReactNode;
  showDetails?: boolean;
  onRetry?: () => void;
  onReset?: () => void;
}

const WhiteLabelErrorHandler = ({ 
  error, 
  fallback, 
  showDetails = false,
  onRetry,
  onReset
}: WhiteLabelErrorHandlerProps) => {
  const { toast } = useToast();

  const handleReportError = () => {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    
    toast({
      title: 'Error Details Copied',
      description: 'Error details have been copied to clipboard for support.',
    });
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  if (!error && !fallback) {
    return null;
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'An unexpected error occurred while loading the white-label configuration.'}
              </AlertDescription>
            </Alert>
          )}

          {showDetails && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {onRetry && (
              <Button 
                onClick={onRetry} 
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            
            {onReset && (
              <Button 
                onClick={onReset} 
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Configuration
              </Button>
            )}

            <Button 
              onClick={handleGoHome} 
              className="flex items-center gap-2"
              variant="outline"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>

            {error && (
              <Button 
                onClick={handleReportError} 
                className="flex items-center gap-2"
                variant="outline"
              >
                <Bug className="w-4 h-4" />
                Copy Error Details
              </Button>
            )}
          </div>

          {fallback && (
            <div className="mt-6 pt-4 border-t">
              {fallback}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabelErrorHandler;