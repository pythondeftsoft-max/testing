import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/providers/PermissionProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PermissionDebugPanelProps {
  portfolioId?: string;
}

export const PermissionDebugPanel: React.FC<PermissionDebugPanelProps> = ({ portfolioId }) => {
  const { user } = useAuth();
  const { hasPermission, accountPermissions, portfolioPermissions, loading } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);

  const runDiagnostics = async () => {
    if (!user?.id || !portfolioId) return;

    try {
      const results: any = {
        user: {
          id: user.id,
          email: user.email
        },
        portfolioId,
        loading,
        clientPermissions: {
          account: accountPermissions,
          portfolio: portfolioPermissions
        }
      };

      // Test account role
      const { data: accountRoles, error: accountRoleError } = await supabase
        .from('account_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      results.accountRoles = { data: accountRoles, error: accountRoleError };

      // Test portfolio role
      const { data: portfolioRoles, error: portfolioRoleError } = await supabase
        .from('portfolio_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolioId);

      results.portfolioRoles = { data: portfolioRoles, error: portfolioRoleError };

      // Test permission objects
      const { data: permissionObjects, error: permObjectError } = await supabase
        .from('permission_objects')
        .select('*')
        .eq('scope', 'portfolio')
        .eq('is_active', true);

      results.permissionObjects = { data: permissionObjects, error: permObjectError };

      // Test RPC functions
      try {
        const { data: effectivePerms, error: effectiveError } = await (supabase as any).rpc('get_portfolio_effective_permissions', {
          p_user_id: user.id,
          p_portfolio_id: portfolioId
        });
        results.rpcEffectivePermissions = { data: effectivePerms, error: effectiveError };
      } catch (rpcError) {
        results.rpcEffectivePermissions = { error: rpcError };
      }

      try {
        const { data: hasPermResult, error: hasPermError } = await (supabase as any).rpc('has_portfolio_permission', {
          p_user_id: user.id,
          p_portfolio_id: portfolioId,
          p_object: 'portfolio.properties',
          p_action: 'create'
        });
        results.rpcHasPermission = { data: hasPermResult, error: hasPermError };
      } catch (rpcError) {
        results.rpcHasPermission = { error: rpcError };
      }

      // Test client permission check
      results.clientHasPermission = hasPermission('portfolio.properties', 'create', 'portfolio');

      setDebugResults(results);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugResults({ error: error });
    }
  };


  if (!user) return null;

  return (
    <Card className="border-warning">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Bug className="h-4 w-4" />
              Permission Debug Panel
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <Button onClick={runDiagnostics} variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Run Diagnostics
              </Button>
              <Badge variant={loading ? "secondary" : "default"}>
                {loading ? "Loading..." : "Ready"}
              </Badge>
            </div>


            {debugResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>User ID:</strong> {debugResults.user?.id}
                  </div>
                  <div>
                    <strong>Portfolio ID:</strong> {debugResults.portfolioId}
                  </div>
                  <div>
                    <strong>Client Permission:</strong> 
                    <Badge variant={debugResults.clientHasPermission ? "default" : "destructive"}>
                      {debugResults.clientHasPermission ? "ALLOWED" : "DENIED"}
                    </Badge>
                  </div>
                  <div>
                    <strong>RPC Permission:</strong>
                    <Badge variant={debugResults.rpcHasPermission?.data ? "default" : "destructive"}>
                      {debugResults.rpcHasPermission?.data ? "ALLOWED" : "DENIED"}
                    </Badge>
                  </div>
                </div>

                <details className="border rounded p-2">
                  <summary className="font-medium cursor-pointer">Account Roles</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(debugResults.accountRoles, null, 2)}
                  </pre>
                </details>

                <details className="border rounded p-2">
                  <summary className="font-medium cursor-pointer">Portfolio Roles</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(debugResults.portfolioRoles, null, 2)}
                  </pre>
                </details>

                <details className="border rounded p-2">
                  <summary className="font-medium cursor-pointer">Permission Objects</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(debugResults.permissionObjects, null, 2)}
                  </pre>
                </details>

                <details className="border rounded p-2">
                  <summary className="font-medium cursor-pointer">Client Permissions</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(debugResults.clientPermissions, null, 2)}
                  </pre>
                </details>

                <details className="border rounded p-2">
                  <summary className="font-medium cursor-pointer">RPC Results</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify({
                      effectivePermissions: debugResults.rpcEffectivePermissions,
                      hasPermission: debugResults.rpcHasPermission
                    }, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};