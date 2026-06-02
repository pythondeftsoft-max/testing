import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, DollarSign, Home, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { ApplicationFilters } from '@/components/applications/ApplicationFilters';

interface ApplicationTrackerProps {
  applications: any[];
}

const ApplicationTracker = ({ applications }: ApplicationTrackerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const getStatusBadge = (status: string, priorityPayment: boolean) => {
    const statusConfig = {
      approved: { 
        variant: 'success' as const, 
        label: 'Approved', 
        icon: CheckCircle,
        className: ''
      },
      rejected: { 
        variant: 'destructive' as const, 
        label: 'Rejected', 
        icon: XCircle,
        className: ''
      },
      pending: { 
        variant: 'warning' as const, 
        label: 'Pending', 
        icon: Clock,
        className: ''
      },
      under_review: { 
        variant: 'occupied' as const, 
        label: 'Under Review', 
        icon: AlertCircle,
        className: ''
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant={config.variant} 
          className={`text-xs shadow-sm flex items-center gap-1 ${config.className}`}
        >
          <IconComponent className="h-3 w-3" />
          {config.label}
        </Badge>
        {priorityPayment && (
          <Badge variant="outline" className="text-xs border-openkey-gold/50 text-openkey-gold">
            🚀 Priority
          </Badge>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let filtered = [...applications];

    // Search filter (property address, rent)
    if (searchTerm) {
      filtered = filtered.filter(app => {
        const address = app.properties?.address?.toLowerCase() || '';
        const rent = app.properties?.monthly_rent?.toString() || '';
        const search = searchTerm.toLowerCase();
        return address.includes(search) || rent.includes(search);
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'rent':
          aValue = a.properties?.monthly_rent || 0;
          bValue = b.properties?.monthly_rent || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [applications, searchTerm, filterStatus, sortBy, sortOrder]);

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Applications
          </CardTitle>
          <CardDescription>Track your rental applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No applications submitted yet.</p>
            <p className="text-sm">Start by searching for properties and submitting applications.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Applications
        </CardTitle>
        <CardDescription>
          Track your {applications.length} rental application{applications.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ApplicationFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          totalCount={applications.length}
          filteredCount={filteredApplications.length}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Monthly Rent</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <div>
                      <div className="font-medium">
                        {application.properties?.address || 'Property address not available'}
                      </div>
                      {application.properties?.bedrooms && application.properties?.bathrooms && (
                        <div className="text-sm text-gray-500">
                          {application.properties.bedrooms}br/{application.properties.bathrooms}ba
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ${application.properties?.monthly_rent?.toLocaleString() || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(application.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(application.status, application.priority_payment_made)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ApplicationTracker;
