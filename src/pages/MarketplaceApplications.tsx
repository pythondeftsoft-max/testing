import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, MapPin, Home, Download, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card as AccessCard } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface MarketplaceApplication {
  id: string;
  property_id: string;
  unit_id: string | null;
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
    owner_id: string;
  } | null;
  property_units?: {
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

const MarketplaceApplications = () => {
  const [applications, setApplications] = useState<MarketplaceApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<MarketplaceApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_applications')
        .select(`
          *,
          properties (
            address,
            monthly_rent,
            owner_id
          ),
          property_units (
            unit_number,
            bedrooms,
            bathrooms
          ),
          profiles (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as unknown as MarketplaceApplication[]) || []);
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

  const filterApplications = () => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.properties?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const exportToCSV = () => {
    try {
      const headers = [
        'Application ID',
        'Applicant Name',
        'Email',
        'Phone',
        'Property Address',
        'Unit Number',
        'Monthly Rent',
        'Status',
        'Applied Date',
        'Submitted Date',
        'Household Size',
        'Voucher Type',
        'Move-in Timeline',
        'Additional Info'
      ];

      const csvData = filteredApplications.map(app => [
        app.id,
        app.contact_name || '',
        app.contact_email || '',
        app.contact_phone || '',
        app.properties?.address || '',
        app.property_units?.unit_number || '',
        app.properties?.monthly_rent || '',
        app.status,
        app.created_at ? new Date(app.created_at).toLocaleDateString() : '',
        app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '',
        app.answers?.householdSize || '',
        app.answers?.voucherType || '',
        app.answers?.moveInTiming || '',
        app.answers?.additionalInfo || ''
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `marketplace-applications-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredApplications.length} applications to CSV.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
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
        <div className="flex items-center space-x-2 mb-6">
          <Home className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Marketplace Applications</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Admin access check
  if (adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <AccessCard>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500 mb-4">
              You need administrator privileges to view marketplace applications.
            </p>
          </div>
        </AccessCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Home className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Marketplace Applications</h1>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{filteredApplications.length}</div>
              <div className="text-sm text-muted-foreground">Total Applications</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => app.status === 'submitted').length}
              </div>
              <div className="text-sm text-muted-foreground">Submitted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => app.status === 'draft').length}
              </div>
              <div className="text-sm text-muted-foreground">Drafts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">
                {filteredApplications.filter(app => app.status === 'withdrawn').length}
              </div>
              <div className="text-sm text-muted-foreground">Withdrawn</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {applications.length === 0 ? 'No Applications Yet' : 'No Matching Applications'}
              </h3>
              <p className="text-gray-500">
                {applications.length === 0 
                  ? 'Applications will appear here once tenants start applying for properties.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{application.properties?.address || 'Property Address Unavailable'}</span>
                      </CardTitle>
                      <CardDescription>
                        {application.property_units && (
                          <span className="mr-4">
                            Unit {application.property_units.unit_number} • 
                            {application.property_units.bedrooms} bed, {application.property_units.bathrooms} bath
                          </span>
                        )}
                        <span className="font-medium">
                          ${application.properties?.monthly_rent?.toLocaleString()}/month
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status === 'submitted' ? 'Submitted' : 
                       application.status === 'draft' ? 'Draft' : 'Withdrawn'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Applicant Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Applicant</h4>
                        <p className="text-sm">{application.contact_name}</p>
                        <p className="text-sm text-gray-500">{application.contact_email}</p>
                        <p className="text-sm text-gray-500">{application.contact_phone}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Application Details</h4>
                        {application.answers?.householdSize && (
                          <p className="text-sm">Household: {application.answers.householdSize} people</p>
                        )}
                        {application.answers?.voucherType && (
                          <p className="text-sm">Voucher: {application.answers.voucherType}</p>
                        )}
                        {application.answers?.moveInTiming && (
                          <p className="text-sm">Move-in: {application.answers.moveInTiming}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Timeline</h4>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <CalendarDays className="h-3 w-3" />
                          <span>Created: {formatDate(application.created_at)}</span>
                        </div>
                        {application.submitted_at && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <CalendarDays className="h-3 w-3" />
                            <span>Submitted: {formatDate(application.submitted_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {application.answers?.additionalInfo && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Additional Information</h4>
                        <p className="text-sm text-gray-600">{application.answers.additionalInfo}</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/marketplace?propertyId=${application.property_id}`, '_blank')}
                      >
                        View Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
};

export default MarketplaceApplications;