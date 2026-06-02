import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Home, AlertCircle, CheckCircle, Clock, Wrench, Users, Settings, Eye, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { MetricDisplay } from '@/components/ui/metric-display';
import MaintenanceVendorManagement from './MaintenanceVendorManagement';
import MaintenanceAppointmentScheduler from './MaintenanceAppointmentScheduler';
import MaintenanceCompletionModal from './MaintenanceCompletionModal';
import MaintenanceRequestDetailModal from './MaintenanceRequestDetailModal';
import AddMaintenanceRequestModal from './AddMaintenanceRequestModal';
import VendorPaymentAnalytics from './VendorPaymentAnalytics';

import MaintenanceBreakdownModal from './MaintenanceBreakdownModal';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard';
import { supabase } from '@/integrations/supabase/client';

interface Property {
  id: string;
  address: string;
}

interface MaintenanceRequestsProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceRequests = ({ userId, portfolioId }: MaintenanceRequestsProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalFilter, setModalFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('requests');
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Use real-time hooks
  const { requests, isLoading, error, updateRequest } = useMaintenanceRequests(portfolioId);
  const { metrics, isLoading: metricsLoading } = useMaintenanceDashboard(portfolioId);

  useEffect(() => {
    fetchProperties();
  }, [userId, portfolioId]);

  const fetchProperties = async () => {
    try {
      console.log('MaintenanceRequests: Fetching properties for userId:', userId, 'portfolioId:', portfolioId);
      
      let query = supabase
        .from('properties')
        .select('id, address')
        .eq('owner_id', userId)
        .order('address');

      if (portfolioId && portfolioId !== 'everything') {
        console.log('MaintenanceRequests: Applying portfolio filter for properties:', portfolioId);
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('MaintenanceRequests: Properties query result:', { 
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
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const statusMatch = filter === 'all' || request.status === filter;
    const propertyMatch = selectedProperty === 'all' || request.property_id === selectedProperty;
    return statusMatch && propertyMatch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const handleCardClick = (status: string, title: string) => {
    console.log('Card clicked:', status, title);
    
    // Map the display status to the correct filter values
    let filterStatus = status;
    if (status === 'active') {
      // For "Active Requests", we need to show all non-completed requests
      filterStatus = 'active'; // We'll handle this special case in the modal
    }
    
    setModalFilter(filterStatus);
    setModalTitle(title);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and badge */}
      <CardEnhanced variant="elevated" hover className="card-hover-gold">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Maintenance Management
            <Badge variant="outline" className="ml-2">
              Enhanced System
            </Badge>
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          {/* Real-time Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CardEnhanced 
              variant="elevated" 
              hover 
              className="card-hover-gold cursor-pointer" 
              onClick={() => handleCardClick('all', 'All Maintenance Requests')}
            >
              <CardEnhancedContent className="p-4">
                <MetricDisplay
                  label="Active Requests"
                  value={metrics?.total_requests || stats.total}
                  icon={<Wrench className="h-4 w-4" />}
                  valueClassName="text-primary"
                />
              </CardEnhancedContent>
            </CardEnhanced>
            
            <CardEnhanced 
              variant="subtle" 
              hover 
              className="card-hover-gold cursor-pointer" 
              onClick={() => handleCardClick('pending', 'Pending Maintenance Requests')}
            >
              <CardEnhancedContent className="p-4">
                <MetricDisplay
                  label="Pending"
                  value={metrics?.pending_requests || stats.pending}
                  icon={<AlertCircle className="h-4 w-4" />}
                  valueClassName="text-accent"
                />
              </CardEnhancedContent>
            </CardEnhanced>
            
            <CardEnhanced 
              variant="elevated" 
              hover 
              className="card-hover-gold cursor-pointer" 
              onClick={() => handleCardClick('in_progress', 'In Progress Maintenance Requests')}
            >
              <CardEnhancedContent className="p-4">
                <MetricDisplay
                  label="In Progress"
                  value={metrics?.in_progress_requests || stats.inProgress}
                  icon={<Clock className="h-4 w-4" />}
                  valueClassName="text-primary"
                />
              </CardEnhancedContent>
            </CardEnhanced>
            
            <CardEnhanced 
              variant="elevated" 
              hover 
              className="card-hover-gold cursor-pointer" 
              onClick={() => handleCardClick('completed', 'Completed Maintenance Requests')}
            >
              <CardEnhancedContent className="p-4">
                <MetricDisplay
                  label="Completed"
                  value={metrics?.completed_requests || stats.completed}
                  icon={<CheckCircle className="h-4 w-4" />}
                  valueClassName="text-success"
                />
              </CardEnhancedContent>
            </CardEnhanced>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Tabs for different maintenance functions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            value="requests" 
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger 
            value="vendors" 
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Vendor Payments
          </TabsTrigger>
          <TabsTrigger 
            value="appointments" 
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Appointments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <CardEnhanced variant="elevated" hover className="card-hover-gold">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Maintenance Requests</CardTitle>
                  <CardDescription>Manage maintenance requests from your tenants</CardDescription>
                </div>
                <div className="flex gap-2">
                  <AddMaintenanceRequestModal 
                    userId={userId} 
                    portfolioId={portfolioId}
                    onRequestCreated={() => {}}
                  />
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger className="w-64">
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
                    <SelectTrigger className="w-48">
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
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance requests</h3>
                  <p className="text-gray-600">
                    {filter === 'all' && selectedProperty === 'all'
                      ? 'No maintenance requests have been submitted yet.'
                      : selectedProperty !== 'all'
                      ? `No ${filter === 'all' ? '' : filter.replace('_', ' ')} requests found for the selected property.`
                      : `No ${filter.replace('_', ' ')} requests found.`
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Property</TableHead>
                      <TableHead className="w-40">Title</TableHead>
                      <TableHead className="w-28">Tenant</TableHead>
                      
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20">Cost</TableHead>
                      <TableHead className="w-20">Payment</TableHead>
                      <TableHead className="w-24">Submitted</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{(request as any).properties?.address || 'Unknown Property'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.title}</div>
                            {request.description && (
                              <div className="text-sm text-gray-600 mt-1 max-w-xs truncate">
                                {request.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {(request as any).profiles?.first_name} {(request as any).profiles?.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(request.status)}
                            <Badge variant={getStatusColor(request.status)}>
                              {request.status.replace('_', ' ').charAt(0).toUpperCase() + 
                               request.status.replace('_', ' ').slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.actual_cost ? (
                            <span className="font-semibold text-sm">${request.actual_cost.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(request as any).vendor_payment_records?.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {(request as any).vendor_payment_records[0].payment_method === 'manual' ? 'Manual' : 'Plaid'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(request.submitted_date), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedRequestId(request.id)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(request.status === 'pending' || request.status === 'in_progress') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setCompletionModalOpen(true);
                                }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Complete
                              </Button>
                            )}
                            {request.status === 'completed' && request.completed_date && (
                              <span className="text-sm text-green-600">
                                Completed {format(new Date(request.completed_date), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </CardEnhanced>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <MaintenanceVendorManagement userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <VendorPaymentAnalytics userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <MaintenanceAppointmentScheduler userId={userId} portfolioId={portfolioId} />
        </TabsContent>

      </Tabs>

      <MaintenanceBreakdownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        landlordId={userId}
        portfolioId={portfolioId}
        filterStatus={modalFilter}
        title={modalTitle}
      />

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

      <MaintenanceRequestDetailModal
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
};

export default MaintenanceRequests;
