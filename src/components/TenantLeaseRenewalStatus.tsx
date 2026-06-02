import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Clock, AlertCircle, FileText, Home, Search, MessageCircle, Lightbulb, RotateCcw, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LeaseRenewalContract } from './LeaseRenewalContract';
import { format } from 'date-fns';

interface LeaseRenewalStatus {
  id: string;
  property_id: string;
  renewal_status: string;
  current_lease_end: string;
  proposed_lease_end: string | null;
  new_rent_amount: number | null;
  notes: string | null;
  response_due_date: string | null;
  created_at: string;
  properties: {
    address: string;
    monthly_rent: number;
  };
}

interface LeaseInfo {
  property_address: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  monthly_rent: number;
  status: string;
  property_id: string;
  bedrooms?: number;
  bathrooms?: number;
  rent_split?: any;
}

interface TenantLeaseRenewalStatusProps {
  userId: string;
  propertyId?: string;
}

export const TenantLeaseRenewalStatus: React.FC<TenantLeaseRenewalStatusProps> = ({ 
  userId, 
  propertyId 
}) => {
  const [renewals, setRenewals] = useState<LeaseRenewalStatus[]>([]);
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContract, setShowContract] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [userId, propertyId]);

  // REMOVED: Aggressive 3-second polling - data fetches on mount and
  // real-time subscriptions + React Query mutations handle updates

  const fetchData = async () => {
    try {
      await Promise.all([fetchRenewalStatus(), fetchLeaseInfo()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewalStatus = async () => {
    try {
      let query = supabase
        .from('lease_renewals')
        .select(`
          *,
          properties!inner(address, monthly_rent)
        `)
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRenewals(data || []);
    } catch (error) {
      console.error('Error fetching renewal status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load lease renewal status",
      });
    }
  };

  const fetchLeaseInfo = async () => {
    try {
      const { data: applications, error: appError } = await supabase
        .from('property_applications')
        .select('*')
        .eq('tenant_id', userId)
        .eq('status', 'approved');

      if (appError) throw appError;

      if (!applications || applications.length === 0) {
        setLeaseInfo([]);
        return;
      }

      const leasePromises = applications.map(async (app) => {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', app.property_id)
          .single();

        if (propertyError || !property) return null;

        const { data: rentSplit } = await supabase
          .from('rent_splits')
          .select('*')
          .eq('property_id', property.id)
          .maybeSingle();

        return {
          property_id: property.id,
          property_address: property.address,
          lease_start_date: property.lease_start_date,
          lease_end_date: property.lease_end_date,
          monthly_rent: rentSplit?.total_rent || property.monthly_rent,
          status: property.status,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rent_split: rentSplit
        };
      });

      const leases = (await Promise.all(leasePromises)).filter(Boolean);
      setLeaseInfo(leases);
    } catch (error) {
      console.error('Error fetching lease info:', error);
    }
  };

  const handleResponse = async (renewalId: string, response: 'accept' | 'decline') => {
    try {
      const { error } = await supabase
        .from('lease_renewals')
        .update({
          renewal_status: response === 'accept' ? 'accepted' : 'declined',
          tenant_response_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', renewalId);

      if (error) throw error;

      // If tenant accepted, create or ensure contract exists
      if (response === 'accept') {
        await ensureContractExists(renewalId);
      }

      // Send enhanced notification to landlord via edge function
      try {
        await supabase.functions.invoke('send-lease-renewal-response-notification', {
          body: {
            leaseRenewalId: renewalId,
            responseType: response,
            declineReason: response === 'decline' ? declineReason : undefined
          }
        });
        console.log('Landlord notification sent successfully');
      } catch (notificationError) {
        console.error('Error sending landlord notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }

      // Force refresh after a small delay to ensure database consistency
      setTimeout(async () => {
        await fetchData();
        
        // If accepted, automatically show the contract
        if (response === 'accept') {
          setShowContract(renewalId);
        }
      }, 500);
      
      toast({
        title: "Success",
        description: `Lease renewal ${response === 'accept' ? 'accepted' : 'declined'} successfully`,
      });
    } catch (error) {
      console.error('Error responding to renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${response} lease renewal`,
      });
    }
  };

  const ensureContractExists = async (renewalId: string) => {
    try {
      // Check if contract already exists
      const { data: existingContract } = await supabase
        .from('lease_renewal_contracts')
        .select('id')
        .eq('lease_renewal_id', renewalId)
        .maybeSingle();

      if (!existingContract) {
        // Create the contract template
        const renewal = renewals.find(r => r.id === renewalId);
        if (!renewal) return;

        const effectiveRent = renewal.new_rent_amount || renewal.properties.monthly_rent;
        const effectiveLeaseEnd = renewal.proposed_lease_end || 
          new Date(new Date(renewal.current_lease_end).setFullYear(new Date(renewal.current_lease_end).getFullYear() + 1)).toISOString().split('T')[0];
        
        const contractTemplate = `LEASE RENEWAL AGREEMENT

Property Address: ${renewal.properties.address}

This Lease Renewal Agreement is entered into between:

LANDLORD: [Landlord Name]
TENANT: [Tenant Name]

TERMS OF RENEWAL:

1. Original lease expiration date: ${new Date(renewal.current_lease_end).toLocaleDateString()}
2. New lease term end date: ${new Date(effectiveLeaseEnd).toLocaleDateString()}
3. Monthly rent amount: $${effectiveRent.toLocaleString()}
4. All other terms and conditions of the original lease remain in effect unless modified herein.

By signing below, both parties agree to the terms of this lease renewal.

SIGNATURES:

Landlord: ___________________________
Date: __________

Tenant: ___________________________
Date: __________`;

        const { error } = await supabase
          .from('lease_renewal_contracts')
          .insert({
            lease_renewal_id: renewalId,
            contract_template: contractTemplate,
            contract_status: 'ready_for_signing'
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error ensuring contract exists:', error);
    }
  };

  const handleDeclineWithReason = async (renewalId: string) => {
    try {
      const { error } = await supabase.rpc('decline_lease_renewal', {
        p_renewal_id: renewalId,
        p_user_id: userId,
        p_reason: declineReason || null
      });

      if (error) throw error;

      // Send enhanced notification to landlord via edge function
      try {
        await supabase.functions.invoke('send-lease-renewal-response-notification', {
          body: {
            leaseRenewalId: renewalId,
            responseType: 'decline',
            declineReason: declineReason || undefined
          }
        });
        console.log('Landlord notification sent successfully');
      } catch (notificationError) {
        console.error('Error sending landlord notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }

      await fetchData();
      setDeclineReason('');
      
      toast({
        title: "Success",
        description: "Lease renewal declined successfully",
      });
    } catch (error) {
      console.error('Error declining renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to decline lease renewal",
      });
    }
  };

  const handleRequestNewRenewal = async (originalRenewal: LeaseRenewalStatus) => {
    try {
      // Create new lease renewal request
      const { error } = await supabase
        .from('lease_renewals')
        .insert({
          property_id: originalRenewal.property_id,
          tenant_id: userId,
          current_lease_end: originalRenewal.current_lease_end,
          renewal_status: 'pending'
        });

      if (error) throw error;

      // Get property details to find landlord
      const { data: propertyData } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', originalRenewal.property_id)
        .single();

      if (propertyData?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: propertyData.owner_id,
          title: 'New Lease Renewal Request',
          description: `Tenant has submitted a new lease renewal request for ${originalRenewal.properties.address}`,
          type: 'lease_renewal_request',
          link: '/dashboard?tab=Lease Expirations&subTab=renewals'
        });
      }

      await fetchData();
      
      toast({
        title: "Success",
        description: "New lease renewal request submitted successfully",
      });
    } catch (error) {
      console.error('Error requesting new renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit new lease renewal request",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-800"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200 text-blue-800"><AlertCircle className="w-3 h-3" />Offer Received</Badge>;
      case 'accepted':
        return <Badge variant="success" className="flex items-center gap-1 bg-green-50 border-green-200 text-green-800"><CheckCircle className="w-3 h-3" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="flex items-center gap-1 bg-red-50 border-red-200 text-red-800"><XCircle className="w-3 h-3" />Declined</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1 bg-red-50 border-red-200 text-red-800"><XCircle className="w-3 h-3" />Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="flex items-center gap-1 bg-muted border-border text-muted-foreground"><Clock className="w-3 h-3" />Expired</Badge>;
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1 bg-green-50 border-green-200 text-green-800"><CheckCircle className="w-3 h-3" />Lease Renewed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaseStatus = (lease: LeaseInfo) => {
    if (!lease.lease_end_date) return { status: 'active', color: 'default' };
    
    const endDate = new Date(lease.lease_end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'destructive' };
    if (daysUntilExpiry <= 30) return { status: 'expiring soon', color: 'secondary' };
    return { status: 'active', color: 'default' };
  };

  const hasActiveLeases = leaseInfo.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <p className="ml-2 text-gray-600">Loading renewal status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (renewals.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Lease Renewal Requests</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You don't have any lease renewal requests at this time. When your lease is up for renewal, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {renewals.map((renewal) => (
        <CardEnhanced key={renewal.id} variant="elevated" className="card-hover-gold shadow-sm">
          <CardEnhancedHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardEnhancedTitle className="text-lg text-openkey-blue">
                  {renewal.properties.address}
                </CardEnhancedTitle>
                <CardTitle className="text-sm text-muted-foreground flex items-center mt-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  Current lease ends: {new Date(renewal.current_lease_end).toLocaleDateString()}
                </CardTitle>
              </div>
              <div className="text-right">
                {getStatusBadge(renewal.renewal_status)}
              </div>
            </div>
          </CardEnhancedHeader>
          <CardEnhancedContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-openkey-blue mb-2">Current Rent</h4>
                <p className="text-2xl font-bold text-foreground">${renewal.properties.monthly_rent.toLocaleString()}/month</p>
              </div>
            </div>

            {renewal.renewal_status === 'sent' && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-openkey-blue">Landlord's Renewal Offer</h4>
                    <Badge variant="success" className="gap-1">
                      <Check className="w-3 h-3" />
                      Landlord Signed
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {renewal.proposed_lease_end && (
                      <div>
                        <h4 className="font-semibold text-openkey-blue mb-2">New Lease End Date</h4>
                        <p className="text-xl font-bold text-foreground">
                          {new Date(renewal.proposed_lease_end).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {renewal.new_rent_amount && (
                      <div>
                        <h4 className="font-semibold text-openkey-blue mb-2">
                          {(renewal as any).new_hap_portion ? 'Total Monthly Rent' : 'Proposed Rent'}
                        </h4>
                        <p className="text-xl font-bold text-openkey-gold">${renewal.new_rent_amount.toLocaleString()}/month</p>
                      </div>
                    )}
                  </div>

                  {((renewal as any).new_hap_portion || (renewal as any).new_tenant_portion) && (
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      {(renewal as any).new_hap_portion && (
                        <div>
                          <h4 className="font-semibold text-openkey-blue mb-2">HAP Portion (PHA Pays)</h4>
                          <p className="text-lg font-bold text-foreground">${parseFloat((renewal as any).new_hap_portion).toLocaleString()}/month</p>
                        </div>
                      )}
                      {(renewal as any).new_tenant_portion && (
                        <div>
                          <h4 className="font-semibold text-openkey-blue mb-2">Tenant Portion (You Pay)</h4>
                          <p className="text-lg font-bold text-openkey-gold">${parseFloat((renewal as any).new_tenant_portion).toLocaleString()}/month</p>
                        </div>
                      )}
                    </div>
                  )}

                  {(renewal as any).new_rent_due_day && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-openkey-blue mb-2">Rent Due Date</h4>
                      <p className="text-lg text-foreground">
                        {(renewal as any).new_rent_due_day}
                        {(renewal as any).new_rent_due_day === 1 ? 'st' : 
                         (renewal as any).new_rent_due_day === 2 ? 'nd' : 
                         (renewal as any).new_rent_due_day === 3 ? 'rd' : 'th'} of each month
                      </p>
                    </div>
                  )}

                  {renewal.notes && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-openkey-blue mb-2">Landlord's Notes</h4>
                      <p className="text-muted-foreground bg-muted p-3 rounded-lg">{renewal.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    onClick={async () => {
                      await ensureContractExists(renewal.id);
                      setShowPreview(renewal.id);
                    }}
                    variant="blue"
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Offer Details
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => handleResponse(renewal.id, 'accept')}
                      className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Offer
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline Offer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Decline Lease Renewal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to decline this lease renewal offer? You can optionally provide a reason.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Reason for declining (optional)"
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeclineWithReason(renewal.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Decline Offer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {renewal.response_due_date && (
                  <p className="text-sm text-gray-600">
                    Response due by: {new Date(renewal.response_due_date).toLocaleDateString()}
                  </p>
                )}
              </>
            )}


            {renewal.renewal_status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  Your lease renewal request has been submitted and is pending landlord review.
                </p>
              </div>
            )}

            {renewal.renewal_status === 'accepted' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  You have accepted the lease renewal offer. The contract is ready for you to review and sign below.
                </p>
              </div>
            )}

            {(renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="text-red-800">
                  This lease renewal was {renewal.renewal_status}. You can request a new renewal from your landlord.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequestNewRenewal(renewal)}
                  className="bg-openkey-blue hover:bg-openkey-blue-dark text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request New Renewal
                </Button>
              </div>
            )}

            {renewal.renewal_status === 'expired' && (
              <div className="bg-muted border border-border rounded-lg p-4 space-y-3">
                <p className="text-muted-foreground">
                  This lease renewal offer has expired. You can request a new renewal from your landlord.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequestNewRenewal(renewal)}
                  className="bg-openkey-blue hover:bg-openkey-blue-dark text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request New Renewal
                </Button>
              </div>
            )}

            {renewal.renewal_status === 'completed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-800 font-medium">
                  🎉 Congratulations! Your lease renewal has been completed successfully!
                </p>
                <p className="text-emerald-700 text-sm mt-2">
                  Your new lease terms are now in effect. You can view and download your signed contract below.
                </p>
              </div>
            )}

            {(renewal.renewal_status === 'accepted' || renewal.renewal_status === 'landlord_signed' || renewal.renewal_status === 'tenant_signed') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContract(showContract === renewal.id ? null : renewal.id)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {showContract === renewal.id ? 'Hide Contract' : 'Review & Sign Contract'}
                </Button>
              </div>
            )}

            {renewal.renewal_status === 'completed' && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContract(showContract === renewal.id ? null : renewal.id)}
                  className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {showContract === renewal.id ? 'Hide Contract' : 'View Signed Contract'}
                </Button>
              </div>
            )}

            {showContract === renewal.id && (
              <div className="mt-4">
                <LeaseRenewalContract
                  renewalId={renewal.id}
                  userType="tenant"
                  propertyAddress={renewal.properties.address}
                  currentRent={renewal.properties.monthly_rent}
                  newRent={renewal.new_rent_amount || undefined}
                  currentLeaseEnd={renewal.current_lease_end}
                  newLeaseEnd={renewal.proposed_lease_end || undefined}
                  tenantName="Tenant"
                  landlordName="Landlord"
                  onContractUpdate={fetchRenewalStatus}
                />
              </div>
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      ))}

      {/* Preview Dialog for viewing offer details before accepting/declining */}
      <Dialog open={!!showPreview} onOpenChange={(open) => !open && setShowPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Lease Renewal Offer Details</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-120px)] pr-4">
            {showPreview && renewals.find(r => r.id === showPreview) && (
              <LeaseRenewalContract
                renewalId={showPreview}
                userType="tenant"
                propertyAddress={renewals.find(r => r.id === showPreview)!.properties.address}
                currentRent={renewals.find(r => r.id === showPreview)!.properties.monthly_rent}
                newRent={renewals.find(r => r.id === showPreview)!.new_rent_amount || undefined}
                currentLeaseEnd={renewals.find(r => r.id === showPreview)!.current_lease_end}
                newLeaseEnd={renewals.find(r => r.id === showPreview)!.proposed_lease_end || undefined}
                tenantName="Tenant"
                landlordName="Landlord"
                onContractUpdate={fetchRenewalStatus}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};