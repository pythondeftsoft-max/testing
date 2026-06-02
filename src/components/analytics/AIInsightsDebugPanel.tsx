import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, Bug, RefreshCcw, ChevronDown, AlertTriangle, CheckCircle, Loader2, Network, Clock, Database } from 'lucide-react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const AIInsightsDebugPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  
  const portfolioId = searchParams.get('portfolioId');

  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
    };
    getCurrentUser();

    // Monitor network requests for debugging
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const requestInfo = {
        url: args[0],
        method: args[1]?.method || 'GET',
        startTime: new Date().toISOString(),
        requestId: `fetch_${Date.now()}`
      };

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        setNetworkRequests(prev => [...prev.slice(-9), {
          ...requestInfo,
          status: response.status,
          statusText: response.statusText,
          duration: Math.round(endTime - startTime),
          success: response.ok,
          endTime: new Date().toISOString()
        }]);

        return response;
      } catch (error) {
        const endTime = performance.now();
        
        setNetworkRequests(prev => [...prev.slice(-9), {
          ...requestInfo,
          status: 0,
          statusText: 'Network Error',
          duration: Math.round(endTime - startTime),
          success: false,
          error: error.message,
          endTime: new Date().toISOString()
        }]);

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const { insights, loading, error, refetch } = useAIInsights(
    currentUser || '', 
    portfolioId || undefined
  );

  const handleManualTest = async () => {
    console.log('🔍 [DEBUG] Manual test started');
    await refetch();
  };

  const getStatusIcon = (success: boolean, loading: boolean) => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="p-6 space-y-6 bg-muted/20 rounded-lg border-2 border-dashed border-yellow-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">AI Insights Debug Panel</h3>
            <p className="text-sm text-yellow-700">Diagnostic information for edge function debugging</p>
          </div>
        </div>
        <Button onClick={handleManualTest} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Test Request
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {getStatusIcon(!error && !loading, loading)}
              Request Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Loading:</span>
                <Badge variant={loading ? 'default' : 'secondary'}>
                  {loading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Error:</span>
                <Badge variant={error ? 'destructive' : 'secondary'}>
                  {error ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Has Data:</span>
                <Badge variant={insights ? 'default' : 'secondary'}>
                  {insights ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Request Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>
                <strong>User ID:</strong> {currentUser || 'Not loaded'}
              </div>
              <div>
                <strong>Portfolio ID:</strong> {portfolioId || 'everything'}
              </div>
              <div>
                <strong>Analysis Type:</strong> comprehensive
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {networkRequests.slice(-3).map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {getStatusIcon(req.success, false)}
                  <span className={req.success ? 'text-green-600' : 'text-red-600'}>
                    {req.status} ({req.duration}ms)
                  </span>
                </div>
              ))}
              {networkRequests.length === 0 && (
                <div className="text-xs text-muted-foreground">No recent requests</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Error Message:</strong>
                <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto">
                  {error}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={debugExpanded} onOpenChange={setDebugExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span>Advanced Debug Information</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${debugExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          <Tabs defaultValue="raw-data" className="w-full">
            <TabsList>
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
              <TabsTrigger value="network-logs">Network Logs</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw-data">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Raw Response Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(insights, null, 2) || 'No data available'}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="network-logs">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Network Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {networkRequests.map((req, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(req.success, false)}
                          <strong>{req.method} {req.status}</strong>
                          <Badge variant="outline">{req.duration}ms</Badge>
                        </div>
                        <div className="text-muted-foreground">
                          {req.url?.toString().substring(0, 100)}...
                        </div>
                        {req.error && (
                          <div className="text-red-600 mt-1">Error: {req.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="environment">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Environment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-2">
                    <div><strong>URL:</strong> {window.location.href}</div>
                    <div><strong>User Agent:</strong> {navigator.userAgent}</div>
                    <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                    <div><strong>Connection:</strong> {(navigator as any).connection?.effectiveType || 'unknown'}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>

      {/* Simple test component to verify if AI component works without errors */}
      {insights && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Success - Data Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700">
              AI Insights loaded successfully! The edge function is working correctly.
              <div className="mt-2 text-xs">
                Data contains: {Object.keys(insights).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};