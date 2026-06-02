
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardEnhanced, CardEnhancedContent, CardEnhancedDescription, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Calendar, Eye, FileText, CheckCircle, XCircle, Clock, AlertTriangle, User, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { LeaseRenewalContract } from './LeaseRenewalContract';
import { EnhancedLeaseRenewalInitiationModal } from './EnhancedLeaseRenewalInitiationModal';

interface LandlordLeaseRenewalTableProps {
  landlordId: string;
  portfolioId?: string;
  activeFilter?: string | null;
}

interface LeaseRenewal {
  id: string;
  property_id: string;
  tenant_id: string;
  current_lease_end: string;
  proposed_lease_end: string;
  new_rent_amount: number;
  renewal_status: string;
  notice_sent_date: string;
  response_due_date: string;
  tenant_response_date: string;
  notes: string;
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

const LandlordLeaseRenewalTable: React.FC<LandlordLeaseRenewalTableProps> = ({
  landlordId,
  portfolioId,
  activeFilter
}) => {
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showInitiationModal, setShowInitiationModal] = useState(false);
  const [showRetractDialog, setShowRetractDialog] = useState(false);
  const [retractionReason, setRetractionReason] = useState('');
  const [selectedRenewal, setSelectedRenewal] = useState<LeaseRenewal | null>(null);
  const [isRetracting, setIsRetracting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaseRenewals();
  }, [landlordId, portfolioId, activeFilter]);

  const fetchLeaseRenewals = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('lease_renewals')
        .select(`
          *,
          properties!inner(
            address,
            monthly_rent,
            owner_id,
            portfolio_id
          ),
          profiles!lease_renewals_tenant_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('properties.owner_id', landlordId)
        .order('created_at', { ascending: false });

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      // Apply status filter
      if (activeFilter) {
        switch (activeFilter) {
          case 'pending':
            query = query.eq('renewal_status', 'pending');
            break;
          case 'sent':
            query = query.in('renewal_status', ['sent', 'approved']);
            break;
          case 'completed':
            query = query.in('renewal_status', ['accepted', 'completed', 'landlord_signed']);
            break;
          case 'declined':
            query = query.in('renewal_status', ['declined', 'rejected']);
            break;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setRenewals(data || []);
    } catch (error) {
      console.error('Error fetching lease renewals:', error);
      setError('Failed to load lease renewals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        );
      case 'sent':
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-blue-500 text-white hover:bg-blue-600">
            <CheckCircle className="w-3 h-3" />
            Sent to Tenant
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </Badge>
        );
      case 'completed':
      case 'landlord_signed':
        return (
          <Badge variant="success" className="gap-1">
            <FileText className="w-3 h-3" />
            Completed
          </Badge>
        );
      case 'rejected':
      case 'declined':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Declined
          </Badge>
        );
      case 'retracted':
        return (
          <Badge variant="neutral" className="gap-1">
            <XCircle className="w-3 h-3" />
            Retracted
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            {status}
          </Badge>
        );
    }
  };

  const handleViewContract = (renewal: LeaseRenewal) => {
    setSelectedRenewal(renewal);
    setShowContractModal(true);
  };

  const handleApproveRenewal = async (renewalId: string) => {
    try {
      const { error } = await supabase
        .from('lease_renewals')
        .update({ 
          renewal_status: 'sent',
          notice_sent_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', renewalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lease renewal approved and sent to tenant",
      });

      fetchLeaseRenewals();
    } catch (error) {
      console.error('Error approving renewal:', error);
      toast({
        title: "Error",
        description: "Failed to approve lease renewal",
        variant: "destructive",
      });
    }
  };

  const handleRejectRenewal = async (renewalId: string) => {
    try {
      const { error } = await supabase
        .from('lease_renewals')
        .update({ renewal_status: 'rejected' })
        .eq('id', renewalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lease renewal rejected",
      });

      fetchLeaseRenewals();
    } catch (error) {
      console.error('Error rejecting renewal:', error);
      toast({
        title: "Error",
        description: "Failed to reject lease renewal",
        variant: "destructive",
      });
    }
  };

  const handleRetractOffer = async () => {
    if (!selectedRenewal) return;

    try {
      setIsRetracting(true);

      // Update lease renewal status to retracted
      const { error: updateError } = await supabase
        .from('lease_renewals')
        .update({ 
          renewal_status: 'retracted',
          retracted_at: new Date().toISOString(),
          retraction_reason: retractionReason || null
        })
        .eq('id', selectedRenewal.id);

      if (updateError) throw updateError;

      // Create notification for tenant
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedRenewal.tenant_id,
          title: 'Lease Renewal Offer Retracted',
          description: `The lease renewal offer for ${selectedRenewal.properties.address} has been withdrawn by the landlord.${retractionReason ? ` Reason: ${retractionReason}` : ''}`,
          type: 'lease_renewal_retracted',
          link: null
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      toast({
        title: "Success",
        description: "Lease renewal offer retracted successfully",
      });

      setShowRetractDialog(false);
      setRetractionReason('');
      setSelectedRenewal(null);
      fetchLeaseRenewals();
    } catch (error) {
      console.error('Error retracting offer:', error);
      toast({
        title: "Error",
        description: "Failed to retract lease renewal offer",
        variant: "destructive",
      });
    } finally {
      setIsRetracting(false);
    }
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="animate-fade-in-up">
        <CardEnhancedContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading lease renewals...
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (error) {
    return (
      <CardEnhanced variant="elevated">
        <CardEnhancedContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-medium mb-2 text-foreground">Error Loading Renewals</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="blue" onClick={fetchLeaseRenewals}>
            Try Again
          </Button>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (renewals.length === 0) {
    return (
      <CardEnhanced variant="subtle">
        <CardEnhancedContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 text-foreground">No Lease Renewals</h3>
          <p className="text-muted-foreground">
            {activeFilter 
              ? `No lease renewals found with status: ${activeFilter}`
              : 'No lease renewal requests found.'
            }
          </p>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Lease Renewal Requests</h3>
          <p className="text-sm text-muted-foreground">
            {renewals.length} renewal{renewals.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Property</TableHead>
              <TableHead className="font-semibold">Tenant</TableHead>
              <TableHead className="font-semibold">Current Lease End</TableHead>
              <TableHead className="font-semibold">Proposed End</TableHead>
              <TableHead className="font-semibold">New Rent</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renewals.map((renewal) => (
              <TableRow key={renewal.id} className="table-row-hover">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-openkey-blue" />
                    <div>
                      <div className="font-medium text-foreground">{renewal.properties.address}</div>
                      <div className="text-sm text-muted-foreground">
                        Current: ${renewal.properties.monthly_rent?.toLocaleString()}/month
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-openkey-gold" />
                    <div className="font-medium text-foreground">
                      {renewal.profiles?.first_name} {renewal.profiles?.last_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(renewal.current_lease_end)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {renewal.proposed_lease_end ? formatDate(renewal.proposed_lease_end) : 'TBD'}
                </TableCell>
                <TableCell>
                  {renewal.new_rent_amount ? (
                    <div>
                      <div className="font-medium text-foreground">${renewal.new_rent_amount.toLocaleString()}</div>
                      {renewal.new_rent_amount !== renewal.properties.monthly_rent && (
                        <div className={`text-sm ${renewal.new_rent_amount > renewal.properties.monthly_rent ? 'text-green-600' : 'text-red-600'}`}>
                          {renewal.new_rent_amount > renewal.properties.monthly_rent ? '+' : ''}
                          ${(renewal.new_rent_amount - renewal.properties.monthly_rent).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">TBD</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    {getStatusBadge(renewal.renewal_status)}
                    {(renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected') && renewal.notes && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Reason: {renewal.notes}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {renewal.renewal_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="blue"
                          onClick={() => handleApproveRenewal(renewal.id)}
                          className="hover:scale-105 transition-all duration-200"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
                          onClick={() => handleRejectRenewal(renewal.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {renewal.renewal_status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                          onClick={() => handleViewContract(renewal)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Contract
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200"
                          onClick={() => {
                            setSelectedRenewal(renewal);
                            setShowRetractDialog(true);
                          }}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Retract Offer
                        </Button>
                      </>
                    )}
                    {(renewal.renewal_status === 'accepted' || renewal.renewal_status === 'completed' || renewal.renewal_status === 'landlord_signed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                        onClick={() => handleViewContract(renewal)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Contract
                      </Button>
                    )}
                    {(renewal.renewal_status === 'declined' || renewal.renewal_status === 'rejected' || renewal.renewal_status === 'retracted') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                        onClick={() => {
                          setSelectedRenewal(renewal);
                          setShowInitiationModal(true);
                        }}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Send New Offer
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Contract Viewing Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lease Renewal Contract</DialogTitle>
          </DialogHeader>
          {selectedRenewal && (
            <LeaseRenewalContract
              renewalId={selectedRenewal.id}
              userType="landlord"
              propertyAddress={selectedRenewal.properties.address}
              tenantName={`${selectedRenewal.profiles?.first_name} ${selectedRenewal.profiles?.last_name}`}
              currentRent={selectedRenewal.properties.monthly_rent}
              newRent={selectedRenewal.new_rent_amount}
              currentLeaseEnd={selectedRenewal.current_lease_end}
              newLeaseEnd={selectedRenewal.proposed_lease_end}
              onContractUpdate={() => {
                fetchLeaseRenewals();
                setShowContractModal(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lease Renewal Initiation Modal */}
      {selectedRenewal && (
        <EnhancedLeaseRenewalInitiationModal
          open={showInitiationModal}
          onOpenChange={setShowInitiationModal}
          propertyId={selectedRenewal.property_id}
          tenantId={selectedRenewal.tenant_id}
          currentRent={selectedRenewal.properties.monthly_rent}
          currentLeaseEnd={selectedRenewal.current_lease_end}
          propertyAddress={selectedRenewal.properties.address}
          landlordId={landlordId}
          onSuccess={() => {
            fetchLeaseRenewals();
            setShowInitiationModal(false);
            setSelectedRenewal(null);
          }}
        />
      )}

      {/* Retract Offer Dialog */}
      <Dialog open={showRetractDialog} onOpenChange={setShowRetractDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retract Lease Renewal Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to retract this lease renewal offer? The tenant will be notified that the offer has been withdrawn.
            </p>
            {selectedRenewal && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">{selectedRenewal.properties.address}</p>
                <p className="text-xs text-muted-foreground">
                  Tenant: {selectedRenewal.profiles?.first_name} {selectedRenewal.profiles?.last_name}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="retraction-reason" className="text-sm font-medium">
                Reason for retraction (optional)
              </label>
              <textarea
                id="retraction-reason"
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Provide a reason for retracting this offer..."
                value={retractionReason}
                onChange={(e) => setRetractionReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRetractDialog(false);
                  setRetractionReason('');
                }}
                disabled={isRetracting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRetractOffer}
                disabled={isRetracting}
              >
                {isRetracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Retracting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Retract Offer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandlordLeaseRenewalTable;
