
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Download, RefreshCw, Filter } from 'lucide-react';

const SystemLogsViewer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('1h');

  // Fetch PostgreSQL logs (mock data for now since we don't have direct access)
  const { data: postgresLogs, isLoading: postgresLoading, refetch: refetchPostgres } = useQuery({
    queryKey: ['postgres-logs', timeFilter],
    queryFn: async () => {
      // Return mock data that matches the structure shown in postgres-logs
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          error_severity: 'LOG',
          event_message: 'connection authorized: user=supabase_admin database=postgres',
          identifier: 'system'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          error_severity: 'LOG',
          event_message: 'connection received: host=::1 port=43043',
          identifier: 'system'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          error_severity: 'ERROR',
          event_message: 'relation "public.security_audit_logs" does not exist',
          identifier: 'system'
        }
      ];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch application logs from existing tables
  const { data: appLogs, isLoading: appLoading, refetch: refetchApp } = useQuery({
    queryKey: ['app-logs', timeFilter],
    queryFn: async () => {
      try {
        // Fetch from email_queue as application logs
        const { data, error } = await supabase
          .from('email_queue')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Transform email queue data to match log format
        return (data || []).map(item => ({
          id: item.id,
          event_type: `email_${item.status}`,
          severity: item.status === 'failed' ? 'ERROR' : 'INFO',
          created_at: item.created_at,
          metadata: { 
            subject: item.subject,
            user_id: item.user_id,
            status: item.status
          }
        }));
      } catch (error) {
        console.error('Error fetching app logs:', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'destructive';
      case 'warning':
      case 'warn':
        return 'secondary';
      case 'info':
      case 'log':
        return 'default';
      default:
        return 'outline';
    }
  };

  const filterLogs = (logs: any[], type: 'postgres' | 'app') => {
    if (!logs) return [];
    
    return logs.filter(log => {
      const message = type === 'postgres' ? log.event_message : log.event_type;
      const severity = type === 'postgres' ? log.error_severity : log.severity;
      
      const matchesSearch = searchTerm === '' || 
        message?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = severityFilter === 'all' || 
        severity?.toLowerCase() === severityFilter.toLowerCase();
      
      return matchesSearch && matchesSeverity;
    });
  };

  const handleRefreshAll = () => {
    refetchPostgres();
    refetchApp();
  };

  const handleExportLogs = () => {
    const allLogs = [
      ...(postgresLogs || []).map(log => ({ ...log, source: 'postgres' })),
      ...(appLogs || []).map(log => ({ ...log, source: 'application' }))
    ];
    
    const dataStr = JSON.stringify(allLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredPostgresLogs = filterLogs(postgresLogs || [], 'postgres');
  const filteredAppLogs = filterLogs(appLogs || [], 'app');

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Logs</span>
            <div className="flex items-center gap-2">
              <Button onClick={handleRefreshAll} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExportLogs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="log">Log</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PostgreSQL Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Database Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {postgresLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredPostgresLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No database logs found for the selected filters.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPostgresLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                  <Badge variant={getSeverityColor(log.error_severity)}>
                    {log.error_severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{log.identifier}</span>
                    </div>
                    <p className="break-words">{log.event_message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Application Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {appLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredAppLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No application logs found for the selected filters.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAppLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                  <Badge variant={getSeverityColor(log.severity || 'info')}>
                    {log.severity || 'INFO'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>{log.metadata?.user_id ? `User: ${log.metadata.user_id.slice(0, 8)}...` : 'System'}</span>
                    </div>
                    <p className="break-words font-medium">{log.event_type}</p>
                    {log.metadata && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogsViewer;
