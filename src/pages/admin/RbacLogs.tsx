import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  Calendar,
  User,
  Eye,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';

interface RbacLogEntry {
  id: string;
  created_at: string;
  user_id: string;
  scope: 'account' | 'portfolio';
  object_name: string;
  action: 'view' | 'edit' | 'create' | 'delete';
  portfolio_id?: string;
  allowed: boolean;
  source: string;
  route: string;
  user_agent: string;
  metadata: Record<string, any>;
}

export default function RbacLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterAllowed, setFilterAllowed] = useState<string>('all');

  // Fetch RBAC logs from the real Supabase table
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['rbac-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('rbac_event_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error fetching RBAC logs:', error);
        throw error;
      }

      return data as RbacLogEntry[];
    },
    staleTime: 30000, // 30 seconds
  });

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.object_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesScope = filterScope === 'all' || log.scope === filterScope;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesAllowed = filterAllowed === 'all' || 
      (filterAllowed === 'allowed' && log.allowed) ||
      (filterAllowed === 'denied' && !log.allowed);

    return matchesSearch && matchesScope && matchesAction && matchesAllowed;
  });

  // Calculate stats for header
  const totalEvents = logs.length;
  const allowedEvents = logs.filter(log => log.allowed).length;
  const deniedEvents = logs.filter(log => !log.allowed).length;
  const allowedPercentage = totalEvents > 0 ? Math.round((allowedEvents / totalEvents) * 100) : 0;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'edit': return <Edit className="h-3 w-3" />;
      case 'create': return <Plus className="h-3 w-3" />;
      case 'delete': return <Trash2 className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getResultBadge = (allowed: boolean) => {
    return allowed ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle className="h-3 w-3 mr-1" />
        Allowed
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
        <XCircle className="h-3 w-3 mr-1" />
        Denied
      </Badge>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RBAC Event Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Logs</h3>
            <p className="text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <div className="bg-gradient-blue-gold rounded-lg p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8" />
              <h2 className="text-4xl font-bold">RBAC Event Logs</h2>
            </div>
            <p className="text-white/90 text-lg">
              Monitor and audit role-based access control events across your account
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold">{totalEvents}</div>
              <div className="text-sm text-white/80">Total Events</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-2xl font-bold">{allowedPercentage}%</div>
              <div className="text-sm text-white/80">Allowed</div>
            </div>
            <div className={`backdrop-blur-sm rounded-lg p-4 border ${deniedEvents > 0 ? 'bg-red-500/20 border-red-300/30' : 'bg-white/10 border-white/20'}`}>
              <div className="text-2xl font-bold">{deniedEvents}</div>
              <div className="text-sm text-white/80">Denied</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search objects, routes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={filterScope} onValueChange={setFilterScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Result</Label>
              <Select value={filterAllowed} onValueChange={setFilterAllowed}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="allowed">Allowed</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              RBAC Event Logs
            </span>
            <Badge variant="outline">
              {filteredLogs.length} events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading RBAC logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No logs found</h3>
              <p className="text-sm">
                {logs.length === 0 
                  ? "No RBAC events have been logged yet. Use the app to generate permission checks."
                  : "No logs match your current filters. Try adjusting the search criteria."
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getActionIcon(log.action)}
                          <span className="font-medium">{log.object_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.scope}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                        {getResultBadge(log.allowed)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        User: {log.user_id.slice(0, 8)}...
                      </div>
                      <div>Route: {log.route}</div>
                      <div>Source: {log.source}</div>
                    </div>
                    
                    {log.portfolio_id && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Portfolio: {log.portfolio_id.slice(0, 8)}...
                      </div>
                    )}
                    
                    {Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          Metadata
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
