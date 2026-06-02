import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProperties } from '@/hooks/useUserProperties';

interface DebugResults {
  authCheck: any;
  dbDirectCheck: any;
  rlsCheck: any;
  hookResults: any;
  timestamp: string;
}

export const PropertyFilterDebugTool = ({ portfolioId = 'everything' }: { portfolioId?: string }) => {
  const [debugResults, setDebugResults] = useState<DebugResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const { user, session, loading } = useAuth();
  const { data: hookProperties, isLoading: hookLoading, error: hookError } = useUserProperties(user?.id || '', portfolioId);

  const runComprehensiveDebug = async () => {
    setIsRunning(true);
    
    try {
      console.log('🔍 [PropertyFilterDebugTool] Starting comprehensive debug...');
      
      // 1. Authentication Check
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      const authCheck = {
        hasSession: !!currentSession,
        sessionUserId: currentSession?.user?.id,
        sessionEmail: currentSession?.user?.email,
        hasAccessToken: !!currentSession?.access_token,
        tokenExpiry: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : null,
        sessionError: sessionError?.message,
        hookUser: user?.id,
        hookUserMatch: user?.id === currentSession?.user?.id
      };

      // 2. Direct Database Check (bypassing RLS)
      const { data: allPropsInDb, error: dbError } = await supabase
        .from('properties')
        .select('id, address, owner_id, portfolio_id')
        .limit(10);

      const dbDirectCheck = {
        totalPropertiesInDb: allPropsInDb?.length || 0,
        sampleProperties: allPropsInDb?.slice(0, 3),
        dbError: dbError?.message,
        targetUserProperties: allPropsInDb?.filter(p => p.owner_id === user?.id) || []
      };

      // 3. RLS Check - Test if user can access their own properties
      const { data: userProps, error: rlsError } = await supabase
        .from('properties')
        .select('id, address, owner_id, portfolio_id')
        .eq('owner_id', user?.id || '')
        .limit(10);

      const rlsCheck = {
        canAccessProperties: !rlsError && userProps && userProps.length > 0,
        userPropertiesFound: userProps?.length || 0,
        sampleUserProperties: userProps?.slice(0, 3),
        rlsError: rlsError?.message,
        rlsBlocking: !rlsError && (userProps?.length || 0) === 0 && (dbDirectCheck.targetUserProperties.length > 0)
      };

      // 4. Hook Results
      const hookResults = {
        hookPropertiesCount: hookProperties?.length || 0,
        hookLoading,
        hookError: hookError?.message,
        sampleHookProperties: hookProperties?.slice(0, 3)
      };

      const results: DebugResults = {
        authCheck,
        dbDirectCheck,
        rlsCheck,
        hookResults,
        timestamp: new Date().toISOString()
      };

      setDebugResults(results);
      console.log('🔍 [PropertyFilterDebugTool] Debug results:', results);
      
    } catch (error) {
      console.error('🔥 [PropertyFilterDebugTool] Debug error:', error);
      setDebugResults({
        authCheck: { error: (error as Error).message },
        dbDirectCheck: { error: (error as Error).message },
        rlsCheck: { error: (error as Error).message },
        hookResults: { error: (error as Error).message },
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (user?.id && !loading) {
      runComprehensiveDebug();
    }
  }, [user?.id, loading]);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (condition: boolean, trueText = "OK", falseText = "FAIL") => {
    return (
      <Badge variant={condition ? "default" : "destructive"} className="text-xs">
        {condition ? trueText : falseText}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Property Filter Diagnostic Tool
          </CardTitle>
          <Button onClick={runComprehensiveDebug} disabled={isRunning} size="sm">
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Debug
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {debugResults ? (
          <div className="space-y-6">
            {/* Authentication Status */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {getStatusIcon(debugResults.authCheck.hasSession && debugResults.authCheck.hookUserMatch)}
                Authentication Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Has Session: {getStatusBadge(debugResults.authCheck.hasSession)}</p>
                  <p>Has Access Token: {getStatusBadge(debugResults.authCheck.hasAccessToken)}</p>
                  <p>User ID Match: {getStatusBadge(debugResults.authCheck.hookUserMatch)}</p>
                </div>
                <div>
                  <p>Session User: <code className="text-xs bg-gray-100 px-1 rounded">{debugResults.authCheck.sessionUserId || 'null'}</code></p>
                  <p>Hook User: <code className="text-xs bg-gray-100 px-1 rounded">{debugResults.authCheck.hookUser || 'null'}</code></p>
                  <p>Email: <code className="text-xs bg-gray-100 px-1 rounded">{debugResults.authCheck.sessionEmail || 'null'}</code></p>
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {getStatusIcon(debugResults.dbDirectCheck.totalPropertiesInDb > 0)}
                Database Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Total Properties in DB: <Badge variant="secondary">{debugResults.dbDirectCheck.totalPropertiesInDb}</Badge></p>
                  <p>User's Properties in DB: <Badge variant="secondary">{debugResults.dbDirectCheck.targetUserProperties.length}</Badge></p>
                </div>
                <div>
                  <p>Database Accessible: {getStatusBadge(!debugResults.dbDirectCheck.dbError)}</p>
                  <p>User Has Properties: {getStatusBadge(debugResults.dbDirectCheck.targetUserProperties.length > 0)}</p>
                </div>
              </div>
            </div>

            {/* RLS Status */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {getStatusIcon(debugResults.rlsCheck.canAccessProperties)}
                Row-Level Security Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Can Access Properties: {getStatusBadge(debugResults.rlsCheck.canAccessProperties)}</p>
                  <p>Properties Found: <Badge variant="secondary">{debugResults.rlsCheck.userPropertiesFound}</Badge></p>
                </div>
                <div>
                  <p>RLS Blocking: {getStatusBadge(!debugResults.rlsCheck.rlsBlocking, "NO", "YES")}</p>
                  {debugResults.rlsCheck.rlsError && (
                    <p className="text-red-600">Error: {debugResults.rlsCheck.rlsError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hook Results */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {getStatusIcon(debugResults.hookResults.hookPropertiesCount > 0)}
                useUserProperties Hook Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Properties Returned: <Badge variant="secondary">{debugResults.hookResults.hookPropertiesCount}</Badge></p>
                  <p>Hook Loading: {getStatusBadge(!debugResults.hookResults.hookLoading, "NO", "YES")}</p>
                </div>
                <div>
                  <p>Hook Working: {getStatusBadge(!debugResults.hookResults.hookError)}</p>
                  {debugResults.hookResults.hookError && (
                    <p className="text-red-600">Error: {debugResults.hookResults.hookError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary & Recommendations */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-3">Diagnosis & Recommendations</h3>
              <div className="space-y-2 text-sm">
                {!debugResults.authCheck.hasSession && (
                  <p className="text-red-600">❌ No active session - User needs to log in</p>
                )}
                {!debugResults.authCheck.hookUserMatch && (
                  <p className="text-red-600">❌ Session user doesn't match hook user - Authentication chain broken</p>
                )}
                {debugResults.dbDirectCheck.targetUserProperties.length === 0 && (
                  <p className="text-orange-600">⚠️ No properties found for this user in database - User may not have any properties</p>
                )}
                {debugResults.rlsCheck.rlsBlocking && (
                  <p className="text-red-600">❌ RLS policies are blocking access to user's own properties - Check RLS configuration</p>
                )}
                {debugResults.hookResults.hookPropertiesCount === 0 && debugResults.dbDirectCheck.targetUserProperties.length > 0 && (
                  <p className="text-red-600">❌ Hook not returning properties that exist in database - Check hook implementation</p>
                )}
                {debugResults.hookResults.hookPropertiesCount > 0 && (
                  <p className="text-green-600">✅ Everything working correctly - Properties are accessible</p>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Last updated: {debugResults.timestamp}
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading user data...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>Click "Run Debug" to start comprehensive diagnostics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};