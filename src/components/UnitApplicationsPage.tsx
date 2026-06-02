import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, MessageCircle, Calendar, MapPin, DollarSign, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import TenantProfileModal from '@/components/TenantProfileModal';

interface UnitApplication {
  id: string;
  tenant_id: string;
  unit_id: string;
  status: string;
  priority_payment_made: boolean;
  created_at: string;
  unit: {
    unit_number: string;
    unit_name: string;
    monthly_rent: number;
    bedrooms: number;
    bathrooms: number;
    property: {
      address: string;
      owner_id: string;
    };
  };
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

const UnitApplicationsPage = () => {
  const [applications, setApplications] = useState<UnitApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<{tenantId: string, unitId: string} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      console.log('Fetching unit applications for user:', user.id);

      const { data, error } = await supabase
        .from('unit_applications')
        .select(`
          *,
          unit:property_units (
            unit_number,
            unit_name,
            monthly_rent,
            bedrooms,
            bathrooms,
            property:properties (
              address,
              owner_id
            )
          ),
          profiles!unit_applications_tenant_id_fkey (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('unit.property.owner_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Raw unit applications data:', data);
      console.log('Unit applications query error:', error);

      if (error) throw error;

      // Filter out any applications where we couldn't fetch profile data
      const validApplications = (data || []).filter(app => {
        const hasProfile = app.profiles && 
          typeof app.profiles === 'object' && 
          'first_name' in app.profiles;
        const hasUnit = app.unit &&
          typeof app.unit === 'object' &&
          'unit_number' in app.unit;
        
        console.log('Unit application validation:', {
          id: app.id,
          hasProfile,
          hasUnit,
          profiles: app.profiles,
          unit: app.unit
        });
        
        return hasProfile && hasUnit;
      }).map(app => ({
        ...app,
        profiles: app.profiles as {
          first_name: string;
          last_name: string;
          phone: string;
        },
        unit: app.unit as {
          unit_number: string;
          unit_name: string;
          monthly_rent: number;
          bedrooms: number;
          bathrooms: number;
          property: {
            address: string;
            owner_id: string;
          };
        }
      }));

      console.log('Valid unit applications after filtering:', validApplications);
      setApplications(validApplications);
    } catch (error) {
      console.error('Error fetching unit applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('unit_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(apps => 
        apps.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus }
            : app
        )
      );

      toast({
        title: "Success",
        description: `Application ${newStatus} successfully.`,
      });
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      approved: 'default',
      denied: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const handleViewProfile = (tenantId: string, unitId: string) => {
    setSelectedTenant({ tenantId, unitId });
  };

  const handleMessage = (applicationId: string) => {
    navigate('/dashboard', { state: { activeTab: 'Messages', applicationId } });
  };

  const [interviewDialog, setInterviewDialog] = useState<{ open: boolean; applicationId: string | null }>({ open: false, applicationId: null });
  const [interviewDate, setInterviewDate] = useState<Date | undefined>();
  const [interviewTime, setInterviewTime] = useState('10:00');

  const handleScheduleInterview = (applicationId: string) => {
    setInterviewDialog({ open: true, applicationId });
  };

  const confirmInterview = () => {
    if (!interviewDate || !interviewDialog.applicationId) return;
    const app = applications.find(a => a.id === interviewDialog.applicationId);
    toast({
      title: "Interview Scheduled",
      description: `Interview with ${app?.profiles?.first_name} ${app?.profiles?.last_name} scheduled for ${format(interviewDate, 'PPP')} at ${interviewTime}`,
    });
    setInterviewDialog({ open: false, applicationId: null });
    setInterviewDate(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading applications...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">Unit Applications</h1>
          <p className="text-muted-foreground">Manage applications from potential tenants for your property units</p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Applications</h3>
              <p className="text-muted-foreground">
                You haven't received any tenant applications yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {application.profiles.first_name} {application.profiles.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {application.unit.unit_name || `Unit ${application.unit.unit_number}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {application.unit.property.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${application.unit.monthly_rent}/month
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.priority_payment_made && (
                        <Badge className="bg-green-100 text-green-800">Priority</Badge>
                      )}
                      {getStatusBadge(application.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                    <p className="text-sm text-muted-foreground">{application.profiles.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Unit Details</h4>
                      <p className="text-sm text-muted-foreground">
                        {application.unit.bedrooms || 'N/A'} bed, {application.unit.bathrooms || 'N/A'} bath
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Applied: {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(application.tenant_id, application.unit_id)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMessage(application.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScheduleInterview(application.id)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule Meeting
                    </Button>

                    {application.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'withdrawn')}
                        >
                          Deny
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedTenant && (
        <TenantProfileModal
          isOpen={!!selectedTenant}
          onClose={() => setSelectedTenant(null)}
          tenantId={selectedTenant.tenantId}
          propertyId={selectedTenant.unitId}
        />
      )}

      <Dialog open={interviewDialog.open} onOpenChange={(open) => !open && setInterviewDialog({ open: false, applicationId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <CalendarComponent
                mode="single"
                selected={interviewDate}
                onSelect={setInterviewDate}
                className={cn("p-3 pointer-events-auto rounded-md border")}
                disabled={(date) => date < new Date()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Time</label>
              <Select value={interviewTime} onValueChange={setInterviewTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialog({ open: false, applicationId: null })}>Cancel</Button>
            <Button onClick={confirmInterview} disabled={!interviewDate}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitApplicationsPage;