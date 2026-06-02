import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Clock, DollarSign, FileText, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LeaseRenewalContract } from './LeaseRenewalContract';
import { LeaseRenewalOverview } from './LeaseRenewalOverview';

interface LeaseRenewal {
  id: string;
  property_id: string;
  tenant_id: string;
  current_lease_end: string;
  proposed_lease_end: string | null;
  new_rent_amount: number | null;
  renewal_status: string;
  notice_sent_date: string | null;
  response_due_date: string | null;
  tenant_response_date: string | null;
  notes: string | null;
  created_at: string;
  properties: {
    address: string;
    monthly_rent: number;
  };
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface LandlordLeaseRenewalsProps {
  landlordId: string;
  portfolioId?: string;
}

export const LandlordLeaseRenewals: React.FC<LandlordLeaseRenewalsProps> = ({ landlordId, portfolioId }) => {
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [filteredRenewals, setFilteredRenewals] = useState<LeaseRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRenewal, setSelectedRenewal] = useState<LeaseRenewal | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({
    status: '',
    newRentAmount: '',
    proposedLeaseEnd: '',
    responseDueDate: '',
    notes: ''
  });
  const [showContract, setShowContract] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRenewals();
  }, [landlordId, portfolioId]);

  useEffect(() => {
    applyFilter();
  }, [renewals, activeFilter]);

  const fetchRenewals = async () => {
    try {
      let query = supabase
        .from('lease_renewals')
        .select(`
          *,
          properties!inner(address, monthly_rent, owner_id, portfolio_id),
          profiles!lease_renewals_tenant_id_fkey(first_name, last_name)
        `)
        .eq('properties.owner_id', landlordId);

      // Apply portfolio filter if not "everything"
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRenewals(data || []);
    } catch (error) {
      console.error('Error fetching renewals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load lease renewals",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!activeFilter) {
      setFilteredRenewals(renewals);
      return;
    }

    const filtered = renewals.filter(renewal => {
      switch (activeFilter) {
        case 'pending':
          return renewal.renewal_status === 'pending';
        case 'sent':
          return renewal.renewal_status === 'sent' || renewal.renewal_status === 'approved';
        case 'completed':
          return renewal.renewal_status === 'completed' || renewal.renewal_status === 'accepted';
        case 'declined':
          return renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected';
        case 'expiring':
          // Filter for leases expiring within 30 days
          const leaseEnd = new Date(renewal.current_lease_end);
          const today = new Date();
          const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          return leaseEnd <= thirtyDaysFromNow && leaseEnd >= today;
        default:
          return true;
      }
    });

    setFilteredRenewals(filtered);
  };

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
  };

  const generateContractTemplate = async (renewal: LeaseRenewal, newRent?: number, newLeaseEnd?: string) => {
    const effectiveRent = newRent || renewal.properties.monthly_rent;
    const effectiveLeaseEnd = newLeaseEnd || new Date(new Date(renewal.current_lease_end).setFullYear(new Date(renewal.current_lease_end).getFullYear() + 1)).toISOString().split('T')[0];
    
    // Fetch rent split data for breakdown
    let hapAmount = 0;
    let tenantAmount = effectiveRent;
    
    try {
      const { data: rentSplit } = await supabase
        .from('rent_splits')
        .select('pha_portion, tenant_portion')
        .eq('property_id', renewal.property_id)
        .eq('tenant_id', renewal.tenant_id)
        .maybeSingle();
      
      if (rentSplit) {
        hapAmount = rentSplit.pha_portion || 0;
        tenantAmount = rentSplit.tenant_portion || effectiveRent;
      }
    } catch (error) {
      console.error('Error fetching rent split:', error);
    }
    
    // Build rent section conditionally
    const rentSection = hapAmount > 0 
      ? `4. RENT PAYMENT BREAKDOWN:
   Total Rent: $${effectiveRent.toLocaleString()}
   Housing Assistance (HAP) Portion: $${hapAmount.toLocaleString()}
   Tenant Portion: $${tenantAmount.toLocaleString()}`
      : `4. Monthly rent amount: $${effectiveRent.toLocaleString()}`;
    
    return `LEASE RENEWAL AGREEMENT

Property Address: ${renewal.properties.address}

This Lease Renewal Agreement is entered into between:

LANDLORD: [Landlord Name]
TENANT: ${renewal.profiles.first_name} ${renewal.profiles.last_name}

TERMS OF RENEWAL:

1. Original lease expiration date: ${new Date(renewal.current_lease_end).toLocaleDateString()}
2. New lease term start date: ${new Date(renewal.current_lease_end).toLocaleDateString()}
3. New lease term end date: ${new Date(effectiveLeaseEnd).toLocaleDateString()}
${rentSection}
5. All other terms and conditions of the original lease remain in effect unless modified herein.

SIGNATURES:

Landlord Signature: ___________________________  Date: __________
[Landlord Name]

Tenant Signature: ___________________________  Date: __________
${renewal.profiles.first_name} ${renewal.profiles.last_name}`;
  };

  const handleResponse = async (renewalId: string, status: 'approved' | 'rejected') => {
    try {
      // Fix: Use 'sent' instead of 'approved' to avoid database constraint issues
      const actualStatus = status === 'approved' ? 'sent' : 'rejected';
      const renewal = renewals.find(r => r.id === renewalId);
      if (!renewal) throw new Error('Renewal not found');

      const updateData: any = {
        renewal_status: actualStatus,
        response_due_date: responseForm.responseDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      if (status === 'approved') {
        if (responseForm.newRentAmount) {
          updateData.new_rent_amount = parseFloat(responseForm.newRentAmount);
        }
        if (responseForm.proposedLeaseEnd) {
          updateData.proposed_lease_end = responseForm.proposedLeaseEnd;
        }
        
        // Create a contract for the landlord to sign first
        const contractTemplate = await generateContractTemplate(renewal, updateData.new_rent_amount, updateData.proposed_lease_end);
        const { data: contractData, error: contractError } = await supabase
          .from('lease_renewal_contracts')
          .insert({
            lease_renewal_id: renewalId,
            contract_template: contractTemplate,
            contract_status: 'draft'
          })
          .select()
          .single();

        if (contractError) {
          console.error('Error creating contract:', contractError);
          throw new Error('Failed to create contract');
        }
      }

      if (responseForm.notes) {
        updateData.notes = responseForm.notes;
      }

      const { error } = await supabase
        .from('lease_renewals')
        .update(updateData)
        .eq('id', renewalId);

      if (error) throw error;

      // Create notification for tenant
      if (renewal?.tenant_id) {
        let notificationTitle = '';
        let notificationDescription = '';
        
        if (status === 'approved') {
          notificationTitle = 'Lease Renewal Offer Received';
          notificationDescription = `Your landlord has sent you a lease renewal offer for ${renewal.properties.address}. Please review and respond.`;
        } else {
          notificationTitle = 'Lease Renewal Request Rejected';
          notificationDescription = `Your lease renewal request for ${renewal.properties.address} has been rejected. Please contact your landlord.`;
        }

        await supabase.from('notifications').insert({
          user_id: renewal.tenant_id,
          title: notificationTitle,
          description: notificationDescription,
          type: status === 'approved' ? 'info' : 'warning',
          link: '/tenant/lease-renewal'
        });
      }

      toast({
        title: "Response Sent",
        description: `Lease renewal ${status} successfully. The tenant has been notified.`,
      });

      // Reset form and close dialog
      setResponseForm({ status: '', newRentAmount: '', proposedLeaseEnd: '', responseDueDate: '', notes: '' });
      setSelectedRenewal(null);
      
      // Refresh data
      fetchRenewals();
    } catch (error) {
      console.error('Error responding to renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send response",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'landlord_signed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Check className="w-3 h-3 mr-1" />Landlord Signed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Check className="w-3 h-3 mr-1" />Offer Sent</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><X className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateNewRenewal = async (originalRenewal: LeaseRenewal) => {
    try {
      const newRentAmount = parseFloat(responseForm.newRentAmount) || originalRenewal.properties.monthly_rent;
      const proposedLeaseEnd = responseForm.proposedLeaseEnd || new Date(new Date(originalRenewal.current_lease_end).setFullYear(new Date(originalRenewal.current_lease_end).getFullYear() + 1)).toISOString().split('T')[0];
      const responseDueDate = responseForm.responseDueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create new lease renewal
      const { data: renewalData, error: renewalError } = await supabase
        .from('lease_renewals')
        .insert({
          property_id: originalRenewal.property_id,
          tenant_id: originalRenewal.tenant_id,
          current_lease_end: originalRenewal.current_lease_end,
          proposed_lease_end: proposedLeaseEnd,
          new_rent_amount: newRentAmount,
          renewal_status: 'sent',
          notice_sent_date: new Date().toISOString().split('T')[0],
          response_due_date: responseDueDate,
          notes: responseForm.notes || null
        })
        .select()
        .single();

      if (renewalError) throw renewalError;

      // Create contract template
      const contractTemplate = await generateContractTemplate(originalRenewal, newRentAmount, proposedLeaseEnd);
      const { error: contractError } = await supabase
        .from('lease_renewal_contracts')
        .insert({
          lease_renewal_id: renewalData.id,
          contract_template: contractTemplate,
          contract_status: 'draft'
        });

      if (contractError) throw contractError;

      // Send notification to tenant
      await supabase.from('notifications').insert({
        user_id: originalRenewal.tenant_id,
        title: 'New Lease Renewal Offer Received',
        description: `Your landlord has sent you a new lease renewal offer for ${originalRenewal.properties.address}. Please review and respond.`,
        type: 'info',
        link: '/tenant/lease-renewal'
      });

      toast({
        title: "Success",
        description: "New lease renewal offer sent to tenant successfully",
      });

      // Reset form and close dialog
      setResponseForm({ status: '', newRentAmount: '', proposedLeaseEnd: '', responseDueDate: '', notes: '' });
      setSelectedRenewal(null);
      
      // Refresh data
      fetchRenewals();
    } catch (error) {
      console.error('Error creating new renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send new lease renewal offer",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading lease renewals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Overview Cards */}
      <LeaseRenewalOverview 
        landlordId={landlordId} 
        portfolioId={portfolioId}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Lease Renewals List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lease Renewal Requests
              {activeFilter && (
                <Badge variant="secondary" className="ml-2">
                  <Filter className="w-3 h-3 mr-1" />
                  {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </Badge>
              )}
            </CardTitle>
            {activeFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter(null)}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredRenewals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {activeFilter 
                ? `No ${activeFilter} lease renewals found`
                : "No lease renewal requests yet"
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRenewals.map((renewal) => (
              <div key={renewal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{renewal.properties.address}</h3>
                    <p className="text-sm text-muted-foreground">
                      Tenant: {renewal.profiles.first_name} {renewal.profiles.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current lease ends: {new Date(renewal.current_lease_end).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current rent: ${renewal.properties.monthly_rent}/month
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(renewal.renewal_status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested: {new Date(renewal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {renewal.renewal_status === 'pending' && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedRenewal(renewal);
                            setResponseForm(prev => ({ ...prev, status: 'approved' }));
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Approve Lease Renewal</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newRent">New Monthly Rent (optional)</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="newRent"
                                type="number"
                                placeholder={renewal.properties.monthly_rent.toString()}
                                value={responseForm.newRentAmount}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, newRentAmount: e.target.value }))}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="proposedEnd">New Lease End Date (optional)</Label>
                            <Input
                              id="proposedEnd"
                              type="date"
                              value={responseForm.proposedLeaseEnd}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, proposedLeaseEnd: e.target.value }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="responseDate">Response Due Date</Label>
                            <Input
                              id="responseDate"
                              type="date"
                              value={responseForm.responseDueDate}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, responseDueDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                              placeholder="Default: 14 days from now"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Leave blank for default 14 days
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes for Tenant (optional)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Any additional terms or conditions..."
                              value={responseForm.notes}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>

                          <Button 
                            onClick={() => handleResponse(renewal.id, 'approved')}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Send Approval
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRenewal(renewal);
                            setResponseForm(prev => ({ ...prev, status: 'rejected' }));
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Decline Lease Renewal</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="declineNotes">Reason for Declining (optional)</Label>
                            <Textarea
                              id="declineNotes"
                              placeholder="Please provide a reason for declining..."
                              value={responseForm.notes}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>

                          <Button 
                            onClick={() => handleResponse(renewal.id, 'rejected')}
                            variant="destructive"
                            className="w-full"
                          >
                            Send Decline Notice
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {(renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected' || renewal.renewal_status === 'expired') && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedRenewal(renewal);
                            setResponseForm(prev => ({ ...prev, status: 'approved' }));
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Send New Offer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send New Lease Renewal Offer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newRent">New Monthly Rent</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="newRent"
                                type="number"
                                placeholder={renewal.properties.monthly_rent.toString()}
                                value={responseForm.newRentAmount}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, newRentAmount: e.target.value }))}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="proposedEnd">New Lease End Date</Label>
                            <Input
                              id="proposedEnd"
                              type="date"
                              value={responseForm.proposedLeaseEnd}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, proposedLeaseEnd: e.target.value }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="responseDate">Response Due Date</Label>
                            <Input
                              id="responseDate"
                              type="date"
                              value={responseForm.responseDueDate}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, responseDueDate: e.target.value }))}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes for Tenant (optional)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Any additional terms or conditions..."
                              value={responseForm.notes}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>

                          <Button 
                            onClick={() => handleCreateNewRenewal(renewal)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            Send New Offer
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {(renewal.renewal_status === 'sent' || renewal.renewal_status === 'landlord_signed' || renewal.renewal_status === 'completed') && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContract(showContract === renewal.id ? null : renewal.id)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      {showContract === renewal.id ? 'Hide Contract' : 'View Contract'}
                    </Button>
                  </div>
                )}

                {renewal.renewal_status !== 'pending' && renewal.notes && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <strong>Response Notes:</strong> {renewal.notes}
                  </div>
                )}

                {showContract === renewal.id && (
                  <div className="mt-4">
                    <LeaseRenewalContract
                      renewalId={renewal.id}
                      userType="landlord"
                      propertyAddress={renewal.properties.address}
                      currentRent={renewal.properties.monthly_rent}
                      newRent={renewal.new_rent_amount || undefined}
                      currentLeaseEnd={renewal.current_lease_end}
                      newLeaseEnd={renewal.proposed_lease_end || undefined}
                      tenantName={`${renewal.profiles.first_name} ${renewal.profiles.last_name}`}
                      onContractUpdate={fetchRenewals}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};