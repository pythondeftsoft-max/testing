import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, Filter, Calendar, User, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface Application {
  id: string;
  status: 'draft' | 'submitted' | 'withdrawn';
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  answers: any;
  created_at: string;
  submitted_at: string | null;
  properties: {
    address: string;
    monthly_rent: number;
  } | null;
  property_units?: {
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
  };
}

const MarketplaceApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_applications')
        .select(`
          *,
          properties (
            address,
            monthly_rent
          ),
          property_units (
            unit_number,
            bedrooms,
            bathrooms
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as unknown as Application[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load applications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.properties.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const now = new Date();
      const applicationDate = new Date(app.created_at);
      
      switch (dateRange) {
        case 'today':
          matchesDate = applicationDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = applicationDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = applicationDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToCsv = () => {
    const headers = [
      'Application ID',
      'Applicant Name',
      'Email',
      'Phone',
      'Property Address',
      'Unit',
      'Monthly Rent',
      'Status',
      'Applied Date',
      'Submitted Date',
      'Household Size',
      'Voucher Type',
      'Move-in Timeline'
    ];

    const csvData = filteredApplications.map(app => [
      app.id,
      app.contact_name,
      maskEmail(app.contact_email),
      app.contact_phone,
      app.properties.address,
      app.property_units?.unit_number || 'N/A',
      app.properties.monthly_rent,
      app.status,
      new Date(app.created_at).toLocaleDateString(),
      app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'N/A',
      app.answers?.householdSize || 'N/A',
      app.answers?.voucherType || 'N/A',
      app.answers?.moveInTiming || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketplace-applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return `${username.substring(0, 2)}***@${domain}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'withdrawn':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard object="marketplace_applications" action="view">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Marketplace Applications</h1>
          <p className="text-gray-600">
            Review and manage tenant applications from the marketplace
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToCsv} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Applications ({filteredApplications.length})</CardTitle>
                <CardDescription>
                  Showing {filteredApplications.length} of {applications.length} applications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
                <p className="text-gray-500">
                  {applications.length === 0 
                    ? "No applications have been submitted yet."
                    : "No applications match your current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{application.contact_name}</div>
                            <div className="text-sm text-gray-500">
                              {maskEmail(application.contact_email)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.contact_phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                            <div>
                              <div className="font-medium">{application.properties.address}</div>
                              <div className="text-sm text-gray-500">
                                ${application.properties.monthly_rent.toLocaleString()}/month
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {application.property_units ? (
                            <div>
                              <div className="font-medium">
                                Unit {application.property_units.unit_number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {application.property_units.bedrooms} bed, {application.property_units.bathrooms} bath
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Whole Property</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status === 'submitted' ? 'Submitted' : 
                             application.status === 'draft' ? 'Draft' : 'Withdrawn'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(application.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {application.submitted_at ? (
                            <div className="flex items-center space-x-1 text-sm">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(application.submitted_at)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not submitted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {application.answers && Object.keys(application.answers).length > 0 && (
                            <div className="text-sm space-y-1">
                              {application.answers.householdSize && (
                                <div><span className="font-medium">Size:</span> {application.answers.householdSize}</div>
                              )}
                              {application.answers.voucherType && (
                                <div><span className="font-medium">Voucher:</span> {application.answers.voucherType}</div>
                              )}
                              {application.answers.moveInTiming && (
                                <div><span className="font-medium">Timeline:</span> {application.answers.moveInTiming}</div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default MarketplaceApplications;