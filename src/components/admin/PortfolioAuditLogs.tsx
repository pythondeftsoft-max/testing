import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Search, Filter, Download, Calendar, User, FileText, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useRbacAuditLogs } from '@/hooks/useRbacAuditLogs';
import { format } from 'date-fns';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { useGlobalRoles } from '@/hooks/useGlobalRoles';
import { PermissionTabErrorBoundary } from './PermissionTabErrorBoundary';

interface AuditLogFilters {
  portfolioId?: string;
  targetUserId?: string;
  changeType?: string;
  dateRange?: string;
  actor?: string;
}

const PortfolioAuditLogs: React.FC = () => {
  
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: auditLogs, isLoading, error: auditError, refetch: refetchAudit } = useRbacAuditLogs({
    portfolioId: filters.portfolioId,
    targetUserId: filters.targetUserId,
    changeType: filters.changeType,
    limit: 100
  });

  const { useAllPortfoliosWithRoles } = useGlobalRoles();
  const { data: portfoliosData, error: portfoliosError } = useAllPortfoliosWithRoles();

  // Handle critical errors
  if (auditError || portfoliosError) {
    return (
      <PermissionGuard 
        object="admin.rbac_logs" 
        action="view" 
        scope="account"
        showDeniedMessage
      >
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load audit logs. Please check your permissions and try again.
              {auditError && <div className="mt-2 text-xs">Audit Error: {auditError.message}</div>}
              {portfoliosError && <div className="mt-2 text-xs">Portfolio Error: {portfoliosError.message}</div>}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => {
              refetchAudit();
            }} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </PermissionGuard>
    );
  }

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'role_insert':
      case 'grant_role':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'role_delete':
      case 'revoke_role':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'role_update':
      case 'update_role':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'role_insert':
      case 'grant_role':
        return <Badge variant="default" className="bg-green-100 text-green-800">Grant</Badge>;
      case 'role_delete':
      case 'revoke_role':
        return <Badge variant="destructive">Revoke</Badge>;
      case 'role_update':
      case 'update_role':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Update</Badge>;
      default:
        return <Badge variant="secondary">{changeType}</Badge>;
    }
  };

  const formatChangeDetails = (log: any) => {
    const oldRole = log.old_value?.role;
    const newRole = log.new_value?.role;
    
    if (log.change_type === 'role_insert' || log.change_type === 'grant_role') {
      return `Granted ${newRole} role`;
    } else if (log.change_type === 'role_delete' || log.change_type === 'revoke_role') {
      return `Revoked ${oldRole} role`;
    } else if (log.change_type === 'role_update' || log.change_type === 'update_role') {
      return `Updated role from ${oldRole} to ${newRole}`;
    }
    return 'Unknown change';
  };

  const exportAuditLogs = () => {
    // Mock export functionality
    console.log('Exporting audit logs...');
  };

  return (
    <PermissionGuard 
      object="admin.rbac_logs" 
      action="view" 
      scope="account"
      showDeniedMessage
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Portfolio RBAC Audit & Logs
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comprehensive audit trail of portfolio access changes and events
            </p>
          </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <PermissionTabErrorBoundary tabName="Audit Logs">
              {/* Filters */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm font-medium">Portfolio</label>
                      <Select 
                        value={filters.portfolioId || 'all'} 
                        onValueChange={(value) => setFilters({...filters, portfolioId: value === 'all' ? undefined : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All portfolios" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Portfolios</SelectItem>
                          {(portfoliosData || []).map((portfolio) => (
                            <SelectItem key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                              {portfolio.portfolio_name || 'Unnamed Portfolio'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Change Type</label>
                      <Select 
                        value={filters.changeType || 'all'} 
                        onValueChange={(value) => setFilters({...filters, changeType: value === 'all' ? undefined : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All changes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Changes</SelectItem>
                          <SelectItem value="role_insert">Grant Role</SelectItem>
                          <SelectItem value="role_delete">Revoke Role</SelectItem>
                          <SelectItem value="role_update">Update Role</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date Range</label>
                      <Select 
                        value={filters.dateRange || 'all'} 
                        onValueChange={(value) => setFilters({...filters, dateRange: value === 'all' ? undefined : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="quarter">This Quarter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Search</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          placeholder="Search logs..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={exportAuditLogs} variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Logs Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Change Type</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Target User</TableHead>
                        <TableHead>Portfolio</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading audit logs...
                          </TableCell>
                        </TableRow>
                      ) : (auditLogs || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No audit logs found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (auditLogs || []).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getChangeTypeIcon(log.change_type)}
                                {getChangeTypeBadge(log.change_type)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {log.actor_profile?.first_name || 'Unknown'} {log.actor_profile?.last_name || 'User'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {log.actor_profile?.email || 'No email'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {log.target_profile?.first_name || 'Unknown'} {log.target_profile?.last_name || 'User'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {log.target_profile?.email || 'No email'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.portfolio?.client_name || 'Unknown Portfolio'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatChangeDetails(log)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </PermissionTabErrorBoundary>
          </div>
        </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default PortfolioAuditLogs;