import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAgentApiLogs, ApiLogFilters, AgentApiLog } from '@/hooks/useAgentApiLogs';
import { useAgentApiKeys } from '@/hooks/useAgentApiKeys';
import { Search, Filter, Clock, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

const getStatusBadge = (status: number | null) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  if (status >= 200 && status < 300) {
    return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
  }
  if (status >= 400 && status < 500) {
    return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  }
  if (status >= 500) {
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{status}</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
};

const getMethodBadge = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <Badge variant="secondary" className={colors[method] || ''}>
      {method}
    </Badge>
  );
};

export const ApiActivityLogs: React.FC = () => {
  const queryClient = useQueryClient();
  const { keys } = useAgentApiKeys();
  const [filters, setFilters] = useState<ApiLogFilters>({});
  const [endpointSearch, setEndpointSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AgentApiLog | null>(null);

  const { data: logs, isLoading, isFetching } = useAgentApiLogs(filters, 100);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['agent-api-logs'] });
  };

  const handleFilterChange = (key: keyof ApiLogFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleEndpointSearch = () => {
    setFilters((prev) => ({
      ...prev,
      endpoint: endpointSearch || undefined,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Endpoint Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Search endpoints..."
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEndpointSearch()}
              />
              <Button variant="outline" size="icon" onClick={handleEndpointSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* API Key Filter */}
            <Select
              value={filters.keyId || 'all'}
              onValueChange={(value) => handleFilterChange('keyId', value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All API Keys" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All API Keys</SelectItem>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success (2xx)</SelectItem>
                <SelectItem value="error">Error (4xx/5xx)</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="font-mono text-xs">
                      {log.created_at
                        ? format(new Date(log.created_at), 'MMM dd, HH:mm:ss')
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.key_name}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.endpoint}
                      </code>
                    </TableCell>
                    <TableCell>{getMethodBadge(log.method)}</TableCell>
                    <TableCell>{getStatusBadge(log.response_status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <h4 className="text-lg font-medium">No Activity Logs</h4>
              <p className="text-sm text-muted-foreground">
                API requests will appear here once they are made
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="font-mono text-sm">
                    {selectedLog.created_at
                      ? format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">API Key</label>
                  <p className="text-sm">{selectedLog.key_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Method</label>
                  <p>{getMethodBadge(selectedLog.method)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p>{getStatusBadge(selectedLog.response_status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="text-sm">{selectedLog.duration_ms}ms</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="font-mono text-sm">{selectedLog.ip_address || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                <code className="block mt-1 bg-muted p-2 rounded text-sm">
                  {selectedLog.endpoint}
                </code>
              </div>

              {selectedLog.request_body && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Request Body</label>
                  <pre className="mt-1 bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response_body && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Response Body</label>
                  <pre className="mt-1 bg-muted p-3 rounded text-xs overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
