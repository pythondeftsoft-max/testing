
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bug, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

export const PermissionDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const debugEnabled = localStorage.getItem('permission-debug:enabled') === 'true';
  const rbacLoggingEnabled = localStorage.getItem('rbac:log:enabled') !== 'false';
  const allowedLoggingEnabled = localStorage.getItem('rbac:log:allowed:enabled') === 'true';
  
  const toggleDebug = (key: string, value: boolean) => {
    localStorage.setItem(key, value.toString());
    console.log(`Debug setting changed: ${key} = ${value}`);
    // Force re-render
    window.location.reload();
  };

  const clearLogs = () => {
    console.clear();
    localStorage.removeItem('permission-debug:logs');
    console.log('Debug logs cleared');
  };

  const exportLogs = () => {
    const logs = {
      localStorage: { ...localStorage },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-debug-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Debug logs exported');
  };

  return (
    <Card className="border-dashed border-yellow-300 bg-yellow-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-yellow-100 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-yellow-600" />
                Permission Debug Panel
                <Badge variant="outline" className="text-xs">
                  {debugEnabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permission Debug</label>
                <Switch
                  checked={debugEnabled}
                  onCheckedChange={(checked) => toggleDebug('permission-debug:enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">RBAC Logging</label>
                <Switch
                  checked={rbacLoggingEnabled}
                  onCheckedChange={(checked) => toggleDebug('rbac:log:enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Log Allowed Actions</label>
                <Switch
                  checked={allowedLoggingEnabled}
                  onCheckedChange={(checked) => toggleDebug('rbac:log:allowed:enabled', checked)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Console
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Export Debug Data
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Permission Debug: Logs component rendering and API calls</p>
              <p>• RBAC Logging: Logs permission checks and decisions</p>
              <p>• Log Allowed Actions: Includes successful permission checks in logs</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
