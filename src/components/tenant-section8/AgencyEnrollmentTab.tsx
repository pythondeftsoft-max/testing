import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';
import { Building2, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OnboardingBanner from './OnboardingBanner';
import RequirementsChecklist from './RequirementsChecklist';

interface AgencyEnrollmentTabProps {
  userId: string;
}

const AgencyEnrollmentTab = ({ userId }: AgencyEnrollmentTabProps) => {
  const queryClient = useQueryClient();
  const [selectedAgency, setSelectedAgency] = useState<{ id: string; name: string } | null>(null);
  const [householdSize, setHouseholdSize] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');

  // Fetch user profile for pre-fill
  const { data: profile } = useQuery({
    queryKey: ['tenant-profile-enroll', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', userId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch agency requirements and onboarding status when selected
  const { data: agencyInfo } = useQuery({
    queryKey: ['agency-enrollment-info', selectedAgency?.id],
    enabled: !!selectedAgency?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('is_onboarded, tenant_enrollment_requirements')
        .eq('id', selectedAgency!.id)
        .single();
      if (error) throw error;
      return data as { is_onboarded: boolean | null; tenant_enrollment_requirements: any[] | null };
    },
  });

  // Fetch existing applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['tenant-waitlist-apps', userId],
    queryFn: async () => {
      if (!profile?.email) return [];
      const { data, error } = await supabase
        .from('voucher_applications')
        .select('*, housing_authorities:agency_id(name, city, state)')
        .eq('email', profile.email)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.email,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgency || !profile) throw new Error('Missing required data');
      const { error } = await supabase.from('voucher_applications').insert({
        agency_id: selectedAgency.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || null,
        household_size: householdSize ? parseInt(householdSize) : null,
        annual_income: annualIncome ? parseFloat(annualIncome) : null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Waitlist application submitted!');
      queryClient.invalidateQueries({ queryKey: ['tenant-waitlist-apps'] });
      setSelectedAgency(null);
      setHouseholdSize('');
      setAnnualIncome('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit application');
    },
  });

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: { label: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' },
    approved: { label: 'Approved', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
    denied: { label: 'Denied', icon: <XCircle className="h-4 w-4" />, color: 'text-destructive' },
    waitlisted: { label: 'Waitlisted', icon: <Clock className="h-4 w-4" />, color: 'text-blue-600' },
  };

  const requirements = agencyInfo?.tenant_enrollment_requirements as any[] | null;

  return (
    <div className="space-y-6">
      {/* Apply to Waitlist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Apply to a Housing Authority Waitlist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Housing Authority</Label>
            <HousingAuthoritySelector
              value={selectedAgency?.id}
              onSelect={(a) => setSelectedAgency(a)}
              placeholder="Search and select a housing authority..."
            />
          </div>

          {/* Onboarding banner */}
          {selectedAgency && agencyInfo && (
            <OnboardingBanner
              isOnboarded={agencyInfo.is_onboarded ?? false}
              agencyName={selectedAgency.name}
            />
          )}

          {/* Requirements checklist */}
          {requirements && requirements.length > 0 && (
            <RequirementsChecklist
              requirements={requirements}
              title="Documents required by this agency"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Household Size</Label>
              <Input
                type="number"
                min="1"
                value={householdSize}
                onChange={(e) => setHouseholdSize(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Income ($)</Label>
              <Input
                type="number"
                min="0"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                placeholder="e.g. 24000"
              />
            </div>
          </div>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={!selectedAgency || applyMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Applications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">My Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !applications || applications.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No waitlist applications yet. Apply to a housing authority above.
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => {
                const sc = statusConfig[app.status] || statusConfig.pending;
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {(app.housing_authorities as any)?.name || 'Unknown Agency'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Applied {format(new Date(app.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`flex items-center gap-1 ${sc.color}`}>
                      {sc.icon}
                      {sc.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyEnrollmentTab;
