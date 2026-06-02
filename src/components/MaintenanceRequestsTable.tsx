
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, AlertCircle, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import MaintenanceCompletionModal from './MaintenanceCompletionModal';
import AddMaintenanceRequestModal from './AddMaintenanceRequestModal';
import { format } from 'date-fns';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { supabase } from '@/integrations/supabase/client';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';

interface Property {
  id: string;
  address: string;
}

interface MaintenanceRequestsTableProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceRequestsTable = ({ userId, portfolioId }: MaintenanceRequestsTableProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { requests, isLoading, error, updateRequest } = useMaintenanceRequests(portfolioId);

  useEffect(() => {
    fetchProperties();
  }, [userId, portfolioId]);

  const fetchProperties = async () => {
    try {
      console.log('MaintenanceRequestsTable: Fetching properties for userId:', userId, 'portfolioId:', portfolioId);
      
      let query = supabase
        .from('properties')
        .select('id, address')
        .eq('owner_id', userId)
        .order('address');

      if (portfolioId && portfolioId !== 'everything') {
        console.log('MaintenanceRequestsTable: Applying portfolio filter for properties:', portfolioId);
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('MaintenanceRequestsTable: Properties query result:', { 
        data, 
        count: data?.length,
        portfolioId: portfolioId 
      });
      
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      await updateRequest.mutateAsync({ id: requestId, ...updateData });
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const statusMatch = filter === 'all' || request.status === filter;
    const propertyMatch = selectedProperty === 'all' || request.property_id === selectedProperty;
    return statusMatch && propertyMatch;
  });

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" animate={true}>
        <CardEnhancedContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 text-muted-foreground">Loading maintenance requests...</p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" hover={true} animate={true} className="card-hover-gold">
      <CardEnhancedHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardEnhancedTitle className="flex items-center gap-2 text-lg font-semibold mb-3" gradient={true}>
              <Search className="h-5 w-5 text-openkey-blue" />
              Maintenance Requests
            </CardEnhancedTitle>
            <CardEnhancedDescription className="text-gray-600">
              Manage and track maintenance requests from your tenants
            </CardEnhancedDescription>
          </div>
          <div className="flex gap-3">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-64 border-openkey-blue/20 focus:border-openkey-blue">
                <Home className="h-4 w-4 mr-2 text-openkey-blue" />
                <SelectValue placeholder="Filter by property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 border-openkey-blue/20 focus:border-openkey-blue">
                <RefreshCw className="h-4 w-4 mr-2 text-openkey-blue" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No maintenance requests</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {filter === 'all' && selectedProperty === 'all'
                ? 'No maintenance requests have been submitted yet. Requests will appear here once tenants submit them.'
                : selectedProperty !== 'all'
                ? `No ${filter === 'all' ? '' : filter.replace('_', ' ')} requests found for the selected property.`
                : `No ${filter.replace('_', ' ')} requests found.`
              }
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground w-32">Property</TableHead>
                  <TableHead className="font-semibold text-foreground w-36">Title</TableHead>
                  <TableHead className="font-semibold text-foreground w-24">Tenant</TableHead>
                  <TableHead className="font-semibold text-foreground w-20">Priority</TableHead>
                  <TableHead className="font-semibold text-foreground w-24">Status</TableHead>
                  <TableHead className="font-semibold text-foreground w-16">Cost</TableHead>
                  <TableHead className="font-semibold text-foreground w-16">Payment</TableHead>
                  <TableHead className="font-semibold text-foreground w-20">Submitted</TableHead>
                  <TableHead className="font-semibold text-foreground w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} className="table-row-hover">
                    <TableCell className="px-2 py-2">
                      <span className="font-medium text-foreground truncate block max-w-[120px]" title={(request as any).properties?.address}>
                        {(request as any).properties?.address || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <div className="truncate max-w-[140px]" title={request.title}>
                        <span className="font-semibold text-foreground">{request.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <span className="font-medium text-foreground truncate block max-w-[90px]">
                        {(request as any).profiles?.first_name} {(request as any).profiles?.last_name?.charAt(0)}.
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Badge 
                        variant={getPriorityColor(request.priority)}
                        className="text-xs"
                      >
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Badge 
                        variant={getStatusColor(request.status)}
                        className="text-xs"
                      >
                        {request.status.replace('_', ' ').charAt(0).toUpperCase() + 
                         request.status.replace('_', ' ').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {request.actual_cost ? (
                        <span className="font-semibold text-foreground text-sm">
                          ${request.actual_cost.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {(request as any).vendor_payment_records?.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {(request as any).vendor_payment_records[0].payment_method === 'manual' ? 'Manual' : 'Plaid'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <span className="text-sm text-foreground">
                        {format(new Date(request.submitted_date), 'MM/dd/yy')}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      {(request.status === 'pending' || request.status === 'in_progress') && (
                        <Button
                          size="sm"
                          variant="blue"
                          onClick={() => {
                            setSelectedRequest(request);
                            setCompletionModalOpen(true);
                          }}
                          className="text-xs px-2 py-1 h-7"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                      {request.status === 'completed' && (
                        <span className="text-xs text-success font-medium">
                          ✓ Done
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardEnhancedContent>

      {selectedRequest && (
        <MaintenanceCompletionModal
          open={completionModalOpen}
          onClose={() => {
            setCompletionModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          portfolioId={portfolioId}
        />
      )}
    </CardEnhanced>
  );
};

export default MaintenanceRequestsTable;
