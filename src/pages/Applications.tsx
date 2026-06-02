import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Application {
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
  } | null;
  property_units?: {
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
  } | null;
}

const Applications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

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
        .eq('user_id', user?.id)
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

  const handleWithdraw = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Application Withdrawn",
        description: "Your application has been withdrawn successfully.",
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
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
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Home className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Applications</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Home className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My Applications</h1>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't submitted any applications yet. Start browsing properties to find your next home.
            </p>
            <Button onClick={() => window.location.href = '/marketplace'}>
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{application.properties?.address}</span>
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
                <div className="space-y-3">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        Applied: {formatDate(application.created_at)}
                      </span>
                    </div>
                    {application.submitted_at && (
                      <div className="flex items-center space-x-1">
                        <CalendarDays className="h-4 w-4" />
                        <span>
                          Submitted: {formatDate(application.submitted_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  {application.answers && Object.keys(application.answers).length > 0 && (
                    <div className="text-sm space-y-1">
                      {application.answers.householdSize && (
                        <p><span className="font-medium">Household Size:</span> {application.answers.householdSize}</p>
                      )}
                      {application.answers.voucherType && (
                        <p><span className="font-medium">Voucher Type:</span> {application.answers.voucherType}</p>
                      )}
                      {application.answers.moveInTiming && (
                        <p><span className="font-medium">Move-in Timeline:</span> {application.answers.moveInTiming}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    {application.status === 'submitted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdraw(application.id)}
                      >
                        Withdraw Application
                      </Button>
                    )}
                    {application.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => window.location.href = `/marketplace?propertyId=${application.property_id}`}
                      >
                        Complete Application
                      </Button>
                    )}
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

export default Applications;