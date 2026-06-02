
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  Activity,
  Clock,
  Globe,
  User,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SecurityLogStream } from './SecurityLogStream';
import { SecurityQueryBuilder } from './SecurityQueryBuilder';
import { SecurityAnalyticsDashboard } from './SecurityAnalyticsDashboard';
import { SecurityTimelineView } from './SecurityTimelineView';

interface SecurityLog {
  id: string;
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  severity: string;
  created_at: string;
  hash: string;
}

interface FilterState {
  dateRange: string;
  customDateFrom?: Date;
  customDateTo?: Date;
  severity: string;
  eventType: string;
  ipAddress: string;
  userId: string;
  searchQuery: string;
}

const RealTimeSecurityMonitor = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealTime, setIsRealTime] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [activeTab, setActiveTab] = useState('stream');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '1h',
    severity: 'all',
    eventType: 'all',
    ipAddress: '',
    userId: '',
    searchQuery: ''
  });
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();

  // Real-time subscription channel
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  const fetchSecurityLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('enterprise_security_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply date range filter
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case '15m':
          startDate = new Date(now.getTime() - 15 * 60 * 1000);
          break;
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '4h':
          startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
          break;
        case '12h':
          startDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (filters.customDateFrom) {
            startDate = filters.customDateFrom;
          } else {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }
          break;
        default:
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());
      
      if (filters.customDateTo && filters.dateRange === 'custom') {
        query = query.lte('created_at', filters.customDateTo.toISOString());
      }

      // Apply additional filters
      if (filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      
      if (filters.eventType !== 'all') {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters.ipAddress) {
        query = query.ilike('ip_address', `%${filters.ipAddress}%`);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedLogs: SecurityLog[] = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | undefined,
        metadata: log.metadata as Record<string, any>
      }));

      setLogs(typedLogs);
      setLastRefresh(new Date());
      
      // Update event counts
      const counts: Record<string, number> = {};
      typedLogs.forEach(log => {
        counts[log.event_type] = (counts[log.event_type] || 0) + 1;
      });
      setEventCounts(counts);
      
    } catch (error) {
      console.error('Error fetching security logs:', error);
      toast({
        title: "Error",
        description: "Failed to load security logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Apply client-side search filter
  useEffect(() => {
    if (!filters.searchQuery) {
      setFilteredLogs(logs);
      return;
    }

    const searchLower = filters.searchQuery.toLowerCase();
    const filtered = logs.filter(log => 
      log.event_type.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(searchLower)) ||
      (log.ip_address && log.ip_address.includes(filters.searchQuery)) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
    );
    
    setFilteredLogs(filtered);
  }, [logs, filters.searchQuery]);

  // Real-time subscription setup
  useEffect(() => {
    if (isRealTime) {
      const channel = supabase
        .channel('security-logs-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'enterprise_security_audit'
          },
          (payload) => {
            const newLog = payload.new as SecurityLog;
            setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 499)]);
            
            toast({
              title: "New Security Event",
              description: `${newLog.event_type} - ${newLog.severity}`,
              variant: newLog.severity === 'critical' || newLog.severity === 'high' 
                ? "destructive" 
                : "default",
            });
          }
        )
        .subscribe();

      setRealtimeChannel(channel);

      // Set up periodic refresh for analytics
      const interval = setInterval(fetchSecurityLogs, refreshInterval * 1000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    } else {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }
    }
  }, [isRealTime, refreshInterval, fetchSecurityLogs]);

  // Initial load
  useEffect(() => {
    fetchSecurityLogs();
  }, [fetchSecurityLogs]);

  const handleExport = async () => {
    try {
      const csvContent = [
        ['Timestamp', 'Event Type', 'Action', 'Severity', 'Resource', 'IP Address', 'User ID', 'Metadata'].join(','),
        ...filteredLogs.map(log => [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.event_type,
          log.action,
          log.severity,
          log.resource_type || '',
          log.ip_address || '',
          log.user_id || '',
          JSON.stringify(log.metadata).replace(/"/g, '""')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${filteredLogs.length} security logs`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export security logs",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Real-Time Security Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isRealTime ? "default" : "secondary"}>
                {isRealTime ? 'LIVE' : 'PAUSED'}
              </Badge>
              <Button
                onClick={() => setIsRealTime(!isRealTime)}
                variant={isRealTime ? "destructive" : "default"}
                size="sm"
              >
                {isRealTime ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRealTime ? 'Pause' : 'Start'} Live
              </Button>
              <Button onClick={fetchSecurityLogs} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button onClick={handleExport} size="sm" variant="outline">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <Select value={filters.dateRange} onValueChange={(value) => 
              setFilters(prev => ({ ...prev, dateRange: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15 minutes</SelectItem>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="4h">Last 4 hours</SelectItem>
                <SelectItem value="12h">Last 12 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity} onValueChange={(value) => 
              setFilters(prev => ({ ...prev, severity: value }))
            }>
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

            <Select value={filters.eventType} onValueChange={(value) => 
              setFilters(prev => ({ ...prev, eventType: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="session_created">Session Created</SelectItem>
                <SelectItem value="rate_limit_exceeded">Rate Limit</SelectItem>
                <SelectItem value="security_incident_created">Security Incident</SelectItem>
                <SelectItem value="compliance_control_updated">Compliance</SelectItem>
                <SelectItem value="login_failed">Login Failed</SelectItem>
                <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="IP Address"
              value={filters.ipAddress}
              onChange={(e) => setFilters(prev => ({ ...prev, ipAddress: e.target.value }))}
            />

            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-4">
              <span>Total Events: {filteredLogs.length}</span>
              <span>Last Updated: {format(lastRefresh, 'HH:mm:ss')}</span>
              {isRealTime && (
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-green-500" />
                  Refresh every {refreshInterval}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isRealTime && (
                <Select value={refreshInterval.toString()} onValueChange={(value) => 
                  setRefreshInterval(parseInt(value))
                }>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stream">Live Stream</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="query">Query Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="stream">
          <SecurityLogStream 
            logs={filteredLogs} 
            loading={loading}
            isRealTime={isRealTime}
            getSeverityColor={getSeverityColor}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <SecurityAnalyticsDashboard 
            logs={filteredLogs}
            eventCounts={eventCounts}
            dateRange={filters.dateRange}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <SecurityTimelineView 
            logs={filteredLogs}
            getSeverityColor={getSeverityColor}
          />
        </TabsContent>

        <TabsContent value="query">
          <SecurityQueryBuilder 
            onQueryChange={(query) => {
              // Handle advanced query filtering
              console.log('Advanced query:', query);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeSecurityMonitor;
