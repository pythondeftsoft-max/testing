import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';
import { ArrowRightLeft, ArrowRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OnboardingBanner from './OnboardingBanner';
import RequirementsChecklist from './RequirementsChecklist';

interface PortingTabProps {
  userId: string;
}

const PortingTab = ({ userId }: PortingTabProps) => {
  const queryClient = useQueryClient();
  const [fromAgency, setFromAgency] = useState<{ id: string; name: string } | null>(null);
  const [toAgency, setToAgency] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch receiving agency requirements and onboarding status
  const { data: toAgencyInfo } = useQuery({
    queryKey: ['agency-porting-info', toAgency?.id],
    enabled: !!toAgency?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('housing_authorities')
        .select('is_onboarded, porting_requirements')
        .eq('id', toAgency!.id)
        .single();
      if (error) throw error;
      return data as { is_onboarded: boolean | null; porting_requirements: any[] | null };
    },
  });

  // Fetch existing porting requests
  const { data: portRequests, isLoading } = useQuery({
    queryKey: ['tenant-porting', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('porting_requests')
        .select('*, from_agency:from_agency_id(name, city, state), to_agency:to_agency_id(name, city, state)')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const portMutation = useMutation({
    mutationFn: async () => {
      if (!fromAgency || !toAgency) throw new Error('Select both agencies');
      if (fromAgency.id === toAgency.id) throw new Error('From and To agencies must be different');
      const { error } = await supabase.from('porting_requests').insert({
        from_agency_id: fromAgency.id,
        to_agency_id: toAgency.id,
        tenant_id: userId,
        requested_by: userId,
        status: 'requested',
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Porting request submitted!');
      queryClient.invalidateQueries({ queryKey: ['tenant-porting'] });
      setFromAgency(null);
      setToAgency(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit porting request');
    },
  });

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    requested: { label: 'Requested', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
    denied: { label: 'Denied', variant: 'destructive' },
    completed: { label: 'Complete', variant: 'default' },
  };

  const portingRequirements = toAgencyInfo?.porting_requirements as any[] | null;

  return (
    <div className="space-y-6">
      {/* New Porting Request */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Request Voucher Port
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Transfer your voucher from one housing authority to another. Both agencies will be notified.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From (Current PHA)</Label>
              <HousingAuthoritySelector
                value={fromAgency?.id}
                onSelect={(a) => setFromAgency(a)}
                placeholder="Select current PHA..."
              />
            </div>
            <div className="space-y-2">
              <Label>To (Receiving PHA)</Label>
              <HousingAuthoritySelector
                value={toAgency?.id}
                onSelect={(a) => setToAgency(a)}
                placeholder="Select destination PHA..."
              />
            </div>
          </div>

          {/* Onboarding banner for receiving agency */}
          {toAgency && toAgencyInfo && (
            <OnboardingBanner
              isOnboarded={toAgencyInfo.is_onboarded ?? false}
              agencyName={toAgency.name}
            />
          )}

          {/* Porting requirements from receiving agency */}
          {portingRequirements && portingRequirements.length > 0 && (
            <RequirementsChecklist
              requirements={portingRequirements}
              title="Documents required by receiving agency"
            />
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for porting, relocation details, etc."
              rows={3}
            />
          </div>
          <Button
            onClick={() => portMutation.mutate()}
            disabled={!fromAgency || !toAgency || portMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {portMutation.isPending ? 'Submitting...' : 'Submit Port Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">My Porting Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : !portRequests || portRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No porting requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {portRequests.map((req: any) => {
                const sc = statusConfig[req.status] || statusConfig.requested;
                return (
                  <div key={req.id} className="p-4 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">
                          {(req.from_agency as any)?.name || 'Unknown'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {(req.to_agency as any)?.name || 'Unknown'}
                        </span>
                      </div>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </p>
                    {req.notes && (
                      <p className="text-sm text-muted-foreground">{req.notes}</p>
                    )}
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

export default PortingTab;
