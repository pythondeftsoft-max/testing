import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileSpreadsheet, Search, AlertCircle, CheckCircle, Clock, Wrench, Eye, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import MaintenanceRequestDetailModal from '@/components/MaintenanceRequestDetailModal';

interface MaintenanceRecord {
  id: string;
  created_at: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  property_id: string;
  unit_id: string | null;
  assigned_vendor_id: string | null;
  property: {
    address: string;
    owner_id: string;
    owner: {
      first_name: string | null;
      last_name: string | null;
      user_type: string;
    } | null;
  };
  property_units: {
    unit_number: string;
    unit_name: string | null;
  } | null;
  maintenance_vendors: {
    company_name: string;
  } | null;
  submitter: {
    first_name: string | null;
    last_name: string | null;
    user_type: string;
  } | null;
}

export function AdminMaintenanceHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const itemsPerPage = 25;

  const { data: maintenanceRecords, isLoading } = useQuery({
    queryKey: ['admin-maintenance-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties!maintenance_requests_property_id_fkey(
            address,
            owner_id,
            owner:profiles!properties_owner_id_fkey(first_name, last_name, user_type)
          ),
          property_units(unit_number, unit_name),
          maintenance_vendors(company_name),
          submitter:profiles!maintenance_requests_tenant_id_fkey(first_name, last_name, user_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MaintenanceRecord[];
    },
  });

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!maintenanceRecords) return { total: 0, pending: 0, completed: 0, totalCosts: 0 };

    const total = maintenanceRecords.length;
    const pending = maintenanceRecords.filter(r => ['pending', 'in_progress'].includes(r.status)).length;
    const completed = maintenanceRecords.filter(r => r.status === 'completed').length;
    const totalCosts = maintenanceRecords.reduce((sum, record) => {
      return sum + (record.actual_cost || 0);
    }, 0);

    return { total, pending, completed, totalCosts };
  }, [maintenanceRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!maintenanceRecords) return [];

    return maintenanceRecords.filter(record => {
      const matchesSearch = searchTerm === '' || 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.property.address.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || record.priority === priorityFilter;
      
      const isTenantSubmitted = record.submitter?.user_type === 'tenant';
      const matchesSource = sourceFilter === 'all' || 
        (sourceFilter === 'tenant' && isTenantSubmitted) ||
        (sourceFilter === 'manual' && !isTenantSubmitted);

      return matchesSearch && matchesStatus && matchesPriority && matchesSource;
    });
  }, [maintenanceRecords, searchTerm, statusFilter, priorityFilter, sourceFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; label: string; className: string }> = {
      pending: { icon: Clock, label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { icon: Wrench, label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
      completed: { icon: CheckCircle, label: 'Completed', className: 'bg-green-100 text-green-800' },
      cancelled: { icon: AlertCircle, label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getOwnerDisplay = (record: MaintenanceRecord) => {
    const owner = record.property?.owner;
    if (!owner) return { name: 'Unknown', type: 'Unknown' };
    
    const name = owner.first_name && owner.last_name 
      ? `${owner.first_name} ${owner.last_name.charAt(0)}.`
      : 'Unknown';
    
    const type = owner.user_type === 'property_manager' ? 'PM' : 'Landlord';
    return { name, type };
  };

  const exportToCSV = () => {
    const csvRows = [
      ['Date', 'Property', 'Unit', 'Title', 'Status', 'Cost', 'PM/LL', 'Submitted By', 'Source', 'Description'],
      ...filteredRecords.map(record => {
        const submitterName = record.submitter?.first_name && record.submitter?.last_name 
          ? `${record.submitter.first_name} ${record.submitter.last_name}` 
          : 'Unknown';
        const source = record.submitter?.user_type === 'tenant' ? 'Tenant' : 'Manual';
        const cost = record.actual_cost ?? record.estimated_cost;
        const ownerInfo = getOwnerDisplay(record);
        
        return [
          format(new Date(record.created_at), 'yyyy-MM-dd'),
          record.property.address,
          record.property_units ? `${record.property_units.unit_name || record.property_units.unit_number}` : 'N/A',
          record.title,
          record.status,
          cost ? cost.toFixed(2) : 'N/A',
          `${ownerInfo.name} (${ownerInfo.type})`,
          submitterName,
          source,
          (record.description || '').replace(/,/g, ';')
        ];
      })
    ];

    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maintenance-records-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl">{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending/In Progress</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{metrics.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{metrics.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Costs</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              ${metrics.totalCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by property or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Source</SelectItem>
                  <SelectItem value="tenant">Tenant Submitted</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToCSV} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Property</TableHead>
                  <TableHead className="w-40">Title</TableHead>
                  <TableHead className="w-28">Tenant</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20">Cost</TableHead>
                  <TableHead className="w-28">PM/LL</TableHead>
                  <TableHead className="w-24">Submitted</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No maintenance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => {
                    const displayCost = record.actual_cost ?? record.estimated_cost;
                    const submitterName = record.submitter?.first_name && record.submitter?.last_name 
                      ? `${record.submitter.first_name} ${record.submitter.last_name}` 
                      : 'Unknown';
                    const isTenantSubmitted = record.submitter?.user_type === 'tenant';
                    const ownerInfo = getOwnerDisplay(record);
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate" title={record.property.address}>
                            {record.property.address}
                          </div>
                          {record.property_units && (
                            <div className="text-xs text-muted-foreground">
                              {record.property_units.unit_name || record.property_units.unit_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate" title={record.title}>
                            {record.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate">{submitterName}</span>
                            {isTenantSubmitted && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">(Tenant)</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {displayCost 
                            ? `$${displayCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate">{ownerInfo.name}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(record.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRequestId(record.id)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedRequestId && (
        <MaintenanceRequestDetailModal
          requestId={selectedRequestId}
          isOpen={!!selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </div>
  );
}