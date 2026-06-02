import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, Download, Eye, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string | null;
  user_agent?: string;
  metadata: Record<string, any>;
  severity: string;
  created_at: string;
  hash: string;
}

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, [severityFilter, eventTypeFilter, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('enterprise_security_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply date filter
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());

      // Apply severity filter
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      // Apply event type filter
      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Cast the data to match our interface with proper type handling
      const typedLogs: AuditLogEntry[] = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        metadata: log.metadata as Record<string, any>
      }));
      
      setLogs(typedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(searchLower)) ||
      (log.ip_address && log.ip_address.includes(searchTerm))
    );
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Shield className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      default:
        return <Eye className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const exportLogs = async () => {
    try {
      const csvContent = [
        ['Timestamp', 'Event Type', 'Action', 'Severity', 'Resource', 'IP Address', 'User Agent'].join(','),
        ...filteredLogs.map(log => [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.event_type,
          log.action,
          log.severity,
          log.resource_type || '',
          log.ip_address || '',
          log.user_agent || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Audit logs exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading audit logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Security Audit Log</CardTitle>
            <Button onClick={exportLogs} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="session_created">Session Created</SelectItem>
                <SelectItem value="rate_limit_exceeded">Rate Limit</SelectItem>
                <SelectItem value="security_incident_created">Security Incident</SelectItem>
                <SelectItem value="compliance_control_updated">Compliance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No audit logs found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSeverityIcon(log.severity)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{log.event_type}</span>
                            <Badge className={getSeverityBadgeColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {log.action} • {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.ip_address && (
                          <div className="text-sm text-gray-500">{log.ip_address}</div>
                        )}
                        {log.resource_type && (
                          <div className="text-xs text-gray-400">{log.resource_type}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">Event ID:</span> {log.id}</div>
                            <div><span className="font-medium">User ID:</span> {log.user_id || 'N/A'}</div>
                            <div><span className="font-medium">Resource:</span> {log.resource_id || 'N/A'}</div>
                            <div><span className="font-medium">Hash:</span> <code className="text-xs">{log.hash.substring(0, 16)}...</code></div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                          <div className="text-sm">
                            {Object.keys(log.metadata).length > 0 ? (
                              <pre className="bg-white p-2 rounded border text-xs overflow-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-gray-500">No additional metadata</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {log.user_agent && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-1">User Agent</h4>
                          <p className="text-sm text-gray-600 font-mono">{log.user_agent}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
