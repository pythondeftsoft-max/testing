import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Calendar, User, Wrench, ChevronLeft, ChevronRight, DollarSign, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useUnitMaintenanceRequests } from '@/hooks/useUnitMaintenanceRequests';
import { formatSpecialty } from '@/utils/maintenanceUtils';
import MaintenanceCompletionModal from '@/components/MaintenanceCompletionModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnitMaintenanceRequestsProps {
  unit: any;
  property: any;
}

export const UnitMaintenanceRequests = ({ unit, property }: UnitMaintenanceRequestsProps) => {
  const [filter, setFilter] = useState('all');
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [maintenanceItemsPerPage, setMaintenanceItemsPerPage] = useState(2);

  const { requests, isLoading } = useUnitMaintenanceRequests(unit.id, property.id);

  // Fetch expense metrics for this unit
  const { data: expenseMetrics } = useQuery({
    queryKey: ['unit-expense-metrics', unit.id],
    queryFn: async () => {
      const { data: expenseData } = await supabase
        .from('vendor_payment_records')
        .select('amount, paid_at')
        .eq('unit_id', unit.id);
      
      const total = expenseData?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonth = expenseData?.filter(exp => {
        if (!exp.paid_at) return false;
        const date = new Date(exp.paid_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      
      return { total, thisMonth };
    },
    enabled: !!unit?.id
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'occupied';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in_progress': return <RefreshCw className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getRequesterName = (request: any) => {
    if (request.profiles?.first_name && request.profiles?.last_name) {
      return `${request.profiles.first_name} ${request.profiles.last_name}`;
    }
    
    if (request.tenant_id === property.owner_id) {
      return 'Landlord';
    }
    
    return 'Unknown';
  };

  const filteredRequests = requests.filter(request => {
    return filter === 'all' || request.status === filter;
  });

  const totalPages = Math.ceil(filteredRequests.length / maintenanceItemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (maintenancePage - 1) * maintenanceItemsPerPage,
    maintenancePage * maintenanceItemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setMaintenanceItemsPerPage(Number(value));
    setMaintenancePage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Maintenance Requests</h3>
            <Badge variant="outline">Unit {unit.unit_number}</Badge>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-muted-foreground">Loading maintenance requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expense Metrics Widgets */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <ClipboardList className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{filteredRequests.length}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                ${(expenseMetrics?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground">Amount Spent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                ${(expenseMetrics?.thisMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground">Spent This Month</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Filter and Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">Maintenance Requests</h3>
            <Badge variant="outline">Unit {unit.unit_number}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <RefreshCw className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Pagination Controls */}
          {filteredRequests.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={maintenanceItemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[60px] h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {((maintenancePage - 1) * maintenanceItemsPerPage) + 1}-{Math.min(maintenancePage * maintenanceItemsPerPage, filteredRequests.length)} of {filteredRequests.length}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  disabled={maintenancePage === 1}
                  onClick={() => setMaintenancePage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  disabled={maintenancePage >= totalPages}
                  onClick={() => setMaintenancePage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Requests Table */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No maintenance requests</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {filter === 'all' 
                ? `No maintenance requests have been submitted for Unit ${unit.unit_number} yet.`
                : `No ${filter.replace('_', ' ')} requests found for Unit ${unit.unit_number}.`
              }
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Title & Description</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Requester
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Priority</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Submitted
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-semibold text-foreground">{request.title}</div>
                        {request.description && (
                          <div className="text-sm text-muted-foreground mt-1 max-w-xs">
                            {request.description.length > 100 
                              ? `${request.description.substring(0, 100)}...` 
                              : request.description
                            }
                          </div>
                        )}
                        {request.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {formatSpecialty(request.category)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{getRequesterName(request)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getPriorityColor(request.priority)}
                        className="flex items-center gap-1 font-medium w-fit"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusColor(request.status)}
                        className="flex items-center gap-1 font-medium w-fit"
                      >
                        {getStatusIcon(request.status)}
                        {request.status.replace('_', ' ').charAt(0).toUpperCase() + 
                         request.status.replace('_', ' ').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {format(new Date(request.submitted_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {(request.status === 'pending' || request.status === 'in_progress') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest({
                                ...request,
                                properties: { address: property.address }
                              });
                              setCompletionModalOpen(true);
                            }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                        {request.status === 'completed' && request.completed_date && (
                          <div className="flex items-center gap-1 text-sm font-medium text-success">
                            <CheckCircle className="h-3 w-3" />
                            Completed {format(new Date(request.completed_date), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <MaintenanceCompletionModal
          open={completionModalOpen}
          onClose={() => {
            setCompletionModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          portfolioId={property.portfolio_id}
        />
      )}
    </div>
  );
};
