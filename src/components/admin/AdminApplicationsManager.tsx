
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, BarChart3 } from 'lucide-react';
import { useAdminApplicationActions } from '@/hooks/useAdminApplicationActions';
import AdminApplicationsTable from './AdminApplicationsTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminApplicationData {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string;
  status: string;
  priority_payment_made: boolean;
  priority_payment_amount: number | null;
  created_at: string;
  updated_at: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_phone: string | null;
  unit_number: string | null;
  unit_name: string | null;
}

interface AdminApplicationsManagerProps {
  propertyId: string;
  propertyAddress: string;
}

const AdminApplicationsManager = ({ 
  propertyId, 
  propertyAddress 
}: AdminApplicationsManagerProps) => {
  const [applications, setApplications] = useState<AdminApplicationData[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    loading,
    listApplications,
    updateApplicationStatus,
    bulkUpdateStatus,
    reassignToUnit,
  } = useAdminApplicationActions(propertyId);

  const fetchApplications = async () => {
    const data = await listApplications(statusFilter, searchTerm);
    setApplications(data);
  };

  useEffect(() => {
    fetchApplications();
  }, [propertyId, statusFilter, searchTerm, refreshKey]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string, reason?: string) => {
    const success = await updateApplicationStatus(applicationId, newStatus, reason);
    if (success) {
      setRefreshKey(prev => prev + 1); // Refresh the list
    }
    return success;
  };

  const handleBulkStatusUpdate = async (applicationIds: string[], newStatus: string, reason?: string) => {
    const updatedCount = await bulkUpdateStatus(applicationIds, newStatus, reason);
    if (updatedCount > 0) {
      setRefreshKey(prev => prev + 1); // Refresh the list
    }
    return updatedCount;
  };

  const handleReassignUnit = async (applicationId: string, unitId: string, reason?: string) => {
    const success = await reassignToUnit(applicationId, unitId, reason);
    if (success) {
      setRefreshKey(prev => prev + 1); // Refresh the list
    }
    return success;
  };

  const getStatusStats = () => {
    const stats = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return stats;
  };

  const exportToCSV = () => {
    const headers = ['Tenant Name', 'Unit', 'Status', 'Applied Date', 'Priority Payment'];
    const csvData = applications.map(app => [
      `${app.tenant_first_name || ''} ${app.tenant_last_name || ''}`.trim(),
      app.unit_number ? `Unit ${app.unit_number}` : 'No unit assigned',
      app.status,
      new Date(app.created_at).toLocaleDateString(),
      app.priority_payment_made ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${propertyId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getChartData = () => {
    return Object.entries(stats).map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count: count as number
    }));
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header with Property Info */}
      <div className="border-b border-amber-200 pb-4">
        <h3 className="text-lg font-semibold text-amber-900">Applications Management</h3>
        <p className="text-sm text-muted-foreground">{propertyAddress}</p>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-3">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            Total: {applications.length}
          </Badge>
          {Object.entries(stats).map(([status, count]) => (
            <Badge key={status} variant="secondary" className="text-xs">
              {status}: {count as number}
            </Badge>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by tenant name or unit number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Status Analytics */}
      {applications.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Application Status Overview</h4>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="status" 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <AdminApplicationsTable
        applications={applications}
        onStatusUpdate={handleStatusUpdate}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onReassignUnit={handleReassignUnit}
        loading={loading}
      />
    </div>
  );
};

export default AdminApplicationsManager;
