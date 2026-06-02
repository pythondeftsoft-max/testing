
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, User, Home, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  submitted_date: string;
  completed_date: string | null;
  property_id: string;
  tenant_id: string;
  properties: {
    address: string;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface MaintenanceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlordId: string;
  portfolioId?: string;
  filterStatus: string;
  title: string;
}

const MaintenanceBreakdownModal = ({ 
  isOpen, 
  onClose, 
  landlordId, 
  portfolioId, 
  filterStatus, 
  title 
}: MaintenanceBreakdownModalProps) => {
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      fetchFilteredRequests();
    }
  }, [isOpen, filterStatus, landlordId, portfolioId]);

  const fetchFilteredRequests = async () => {
    try {
      setLoading(true);
      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner(address, portfolio_id),
          profiles!maintenance_requests_tenant_id_fkey(first_name, last_name)
        `)
        .eq('properties.owner_id', landlordId);

      if (portfolioId && portfolioId !== 'everything') {
        // Handle null portfolio_id values properly
        if (portfolioId === 'null' || portfolioId === null) {
          query = query.is('properties.portfolio_id', null);
        } else {
          query = query.eq('properties.portfolio_id', portfolioId);
        }
      }

      if (filterStatus !== 'all') {
        if (filterStatus === 'active') {
          // Active requests are all non-completed requests
          query = query.neq('status', 'completed');
        } else {
          query = query.eq('status', filterStatus);
        }
      }

      const { data, error } = await query.order('submitted_date', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching filtered requests:', error);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No maintenance requests found for this filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.properties.address}</span>
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
                          {request.profiles.first_name} {request.profiles.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(request.priority)}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
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
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(request.submitted_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceBreakdownModal;
