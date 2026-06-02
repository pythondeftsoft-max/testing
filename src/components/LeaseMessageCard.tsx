import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Calendar, CheckCircle, Clock, Download, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { LeaseDocumentPreview } from '@/components/landlord/LeaseDocumentPreview';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSignLease } from '@/hooks/useTenantSignLease';
import { useCancelLease } from '@/hooks/useCancelLease';
import { generateLeasePDF } from '@/utils/leasePDFGenerator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeaseMessageCardProps {
  message: any;
  isSender: boolean;
  userType: 'tenant' | 'landlord';
  application?: any;
  onUpdate?: () => void;
}

const LeaseMessageCard: React.FC<LeaseMessageCardProps> = ({ 
  message, 
  isSender, 
  userType,
  application 
}) => {
  const [showLeasePreview, setShowLeasePreview] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  
  const signLeaseMutation = useTenantSignLease();
  const cancelLeaseMutation = useCancelLease();
  
  // Extract data from message
  const leaseDocumentId = message.payload?.lease_document_id;
  const leaseMethod = message.payload?.lease_method || 'openkey';
  const leaseStatus = application?.lifecycle_stage || applicationData?.lifecycle_stage || 'lease_sent';

  // Fetch application data if not provided
  useEffect(() => {
    // Always fetch fresh data to get latest signature information
    fetchApplicationData();
  }, [message]);

  // Refetch when cancel mutation succeeds
  useEffect(() => {
    if (cancelLeaseMutation.isSuccess) {
      fetchApplicationData();
    }
  }, [cancelLeaseMutation.isSuccess]);

  const fetchApplicationData = async () => {
    const appId = message.property_application_id || message.marketplace_application_id || message.unit_application_id || message.property_push_id;
    if (!appId) return;

    try {
      let data: any = null;
      
      // First try marketplace_applications with signature fields
      if (message.marketplace_application_id) {
        const result = await supabase
          .from('marketplace_applications')
          .select(`
            *,
            landlord_signature_name,
            landlord_signed_at,
            tenant_signature_name,
            tenant_signed_at,
            properties (
              street_address,
              city,
              state,
              zipcode,
              monthly_rent
            ),
            property_units (
              monthly_rent,
              unit_number
            )
          `)
          .eq('id', message.marketplace_application_id)
          .maybeSingle();
        data = result.data;
      }

      // If not found, try property_applications with signature fields
      if (!data && message.property_application_id) {
        const result = await supabase
          .from('property_applications')
          .select(`
            *,
            landlord_signature_name,
            landlord_signed_at,
            properties (
              street_address,
              city,
              state,
              zipcode,
              monthly_rent
            ),
            property_units (
              monthly_rent,
              unit_number
            )
          `)
          .eq('id', message.property_application_id)
          .maybeSingle();
        
        data = result.data;
      }

      // If not found, try property_pushes with signature fields
      if (!data && message.property_push_id) {
        const result = await supabase
          .from('property_pushes')
          .select(`
            *,
            landlord_signature_name,
            landlord_signed_at,
            tenant_signature_name,
            tenant_signed_at,
            lease_fully_executed_at,
            properties (
              street_address,
              city,
              state,
              zipcode,
              monthly_rent
            ),
            property_units (
              monthly_rent,
              unit_number
            )
          `)
          .eq('id', message.property_push_id)
          .maybeSingle();
        
        data = result.data;
        
        // For property_pushes, fetch tenant profile using tenant_id
        if (data?.tenant_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', data.tenant_id)
            .maybeSingle();
          
          if (profileData) {
            data.tenant = profileData;
          }
        }
      }

      // Fetch tenant profile separately using user_id (for marketplace/property applications)
      if (data?.user_id && !data.tenant) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.user_id)
          .maybeSingle();
        
        if (profileData) {
          data.tenant = profileData;
        }
      }

      if (data) {
        setApplicationData(data);
      }
    } catch (error) {
      console.error('Error fetching application data:', error);
    }
  };
  
  const getStatusDisplay = () => {
    const isFullyExecuted = applicationData?.lease_fully_executed_at;
    const currentStatus = applicationData?.status;
    
    if (isFullyExecuted) {
      return {
        text: 'Fully Executed',
        className: 'bg-green-100 text-green-800 border-green-200',
        borderColor: 'border-l-green-500',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      };
    }
    
    if (leaseStatus === 'lease_signed') {
      return {
        text: 'Signed',
        className: 'bg-green-100 text-green-800 border-green-200',
        borderColor: 'border-l-green-500',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      };
    }
    
    // If status is primary_applicant but this is a lease message, it means canceled
    if (currentStatus === 'primary_applicant' && message.extension === 'lease_notification') {
      return {
        text: 'Canceled',
        className: 'bg-muted text-muted-foreground border-border',
        borderColor: 'border-l-gray-400',
        icon: <XCircle className="h-5 w-5 text-muted-foreground" />
      };
    }
    
    return {
      text: 'Pending Signature',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      borderColor: 'border-l-orange-500',
      icon: <Clock className="h-5 w-5 text-orange-500" />
    };
  };

  const statusDisplay = getStatusDisplay();

  // Extract lease preview data - prioritize message payload, then application data
  const tenantName = message.payload?.tenant_name 
    || (applicationData?.tenant 
      ? `${applicationData.tenant.first_name || ''} ${applicationData.tenant.last_name || ''}`.trim()
      : null)
    || 'Tenant';
  
  const propertyAddress = message.payload?.property_address 
    || applicationData?.properties?.street_address 
    || 'Property Address';
  
  // Prioritize message payload for monthly rent (most reliable source)
  const monthlyRent = message.payload?.monthly_rent
    || applicationData?.property_units?.monthly_rent 
    || applicationData?.properties?.monthly_rent 
    || applicationData?.monthly_rent 
    || 0;
  
  const unitNumber = message.payload?.unit_number || applicationData?.property_units?.unit_number;
  const leaseStartDate = message.payload?.lease_start_date || applicationData?.lease_start_date;
  const leaseEndDate = message.payload?.lease_end_date || applicationData?.lease_end_date;
  
  // Signature data - from application data or message payload
  const landlordSignature = applicationData?.landlord_signature_name || message.payload?.landlord_signature;
  const landlordSignedAt = applicationData?.landlord_signed_at || message.payload?.landlord_signed_at;

  const handleViewLease = () => {
    setShowLeasePreview(true);
  };

  const handleSignLease = () => {
    setShowSignDialog(true);
  };
  
  const handleConfirmSign = async () => {
    if (!signatureName.trim()) return;
    
    const appId = applicationData?.id || application?.id;
    if (!appId) return;
    
    await signLeaseMutation.mutateAsync({
      applicationId: appId,
      tenantSignature: signatureName,
    });
    
    setShowSignDialog(false);
    setSignatureName('');
    fetchApplicationData(); // Refresh data
  };
  
  const handleDownloadLease = () => {
    generateLeasePDF({
      tenantName,
      propertyAddress,
      unitNumber,
      monthlyRent,
      leaseStartDate,
      leaseEndDate,
      landlordSignature,
      landlordSignedAt,
      tenantSignature: applicationData?.tenant_signature_name,
      tenantSignedAt: applicationData?.tenant_signed_at,
    });
  };

  return (
    <div className={cn("flex w-full", isSender ? "justify-end" : "justify-start")}>
      <Card className={cn(
        "w-full max-w-2xl border-l-4 hover:bg-accent/30 transition-colors",
        statusDisplay.borderColor
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-lg">📝 Lease Agreement</h4>
            </div>
            <Badge variant="outline" className={cn("capitalize", statusDisplay.className)}>
              {statusDisplay.icon}
              <span className="ml-2">{statusDisplay.text}</span>
            </Badge>
          </div>
          
          {/* Message Text */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {message.message_text}
          </p>
          
          {/* Lease Method Info */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              {leaseMethod === 'uploaded' ? '📄 Custom Lease' : '🔑 OpenKey Lease'}
            </Badge>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Sent {formatDate(new Date(message.created_at))}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleViewLease}
                className="shrink-0"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Lease
              </Button>
              
              {applicationData?.lease_fully_executed_at && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadLease}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
              
              {userType === 'tenant' && 
               !applicationData?.tenant_signature_name && 
               landlordSignature && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleSignLease}
                  className="shrink-0"
                  disabled={signLeaseMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {signLeaseMutation.isPending ? 'Signing...' : 'Sign Lease'}
                </Button>
              )}
              
              {/* Cancel Lease Button - only for landlords when lease is pending tenant signature */}
              {userType === 'landlord' && 
               message.property_push_id &&
               applicationData?.status === 'lease_sent' &&
               !applicationData?.tenant_signature_name && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="shrink-0"
                      disabled={cancelLeaseMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {cancelLeaseMutation.isPending ? 'Canceling...' : 'Cancel Lease'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Lease?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the current lease and allow you to send a new one.
                        The tenant will no longer be able to sign this lease.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Lease</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelLeaseMutation.mutate({ propertyPushId: message.property_push_id })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Lease
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Preview Dialog */}
      <LeaseDocumentPreview
        open={showLeasePreview}
        onOpenChange={setShowLeasePreview}
        tenantName={tenantName}
        propertyAddress={propertyAddress}
        unitNumber={unitNumber}
        monthlyRent={monthlyRent}
        leaseStartDate={leaseStartDate}
        leaseEndDate={leaseEndDate}
        landlordSignature={landlordSignature}
        landlordSignedAt={landlordSignedAt}
        tenantSignature={applicationData?.tenant_signature_name}
        tenantSignedAt={applicationData?.tenant_signed_at}
      />

      {/* Tenant Signature Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Lease Agreement</DialogTitle>
            <DialogDescription>
              Please enter your full name to electronically sign this lease agreement. 
              This signature is legally binding.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signature">Your Full Name</Label>
              <Input
                id="signature"
                placeholder="Enter your full name"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && signatureName.trim()) {
                    handleConfirmSign();
                  }
                }}
              />
            </div>
            
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Property:</p>
              <p className="text-muted-foreground">{propertyAddress}</p>
              {unitNumber && (
                <p className="text-muted-foreground">Unit: {unitNumber}</p>
              )}
              <p className="text-muted-foreground mt-2">
                Monthly Rent: {monthlyRent > 0 ? `$${monthlyRent.toFixed(2)}` : 'See lease document'}
              </p>
              {(leaseStartDate || leaseEndDate) && (
                <p className="text-muted-foreground mt-1">
                  Lease Period: {leaseStartDate || 'TBD'} - {leaseEndDate || 'TBD'}
                </p>
              )}
            </div>
            
            <div className="flex items-start space-x-2 p-3 rounded-lg bg-accent/50 border">
              <Checkbox 
                id="confirm-lease-tenant" 
                checked={termsConfirmed}
                onCheckedChange={(checked) => setTermsConfirmed(checked as boolean)}
                disabled={!signatureName.trim()}
              />
              <Label 
                htmlFor="confirm-lease-tenant" 
                className={`text-xs font-medium leading-tight ${signatureName.trim() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                I confirm I have read and understand the lease agreement terms and agree to sign this legally binding document
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSignDialog(false)}
              disabled={signLeaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSign}
              disabled={!signatureName.trim() || !termsConfirmed || signLeaseMutation.isPending}
            >
              {signLeaseMutation.isPending ? 'Signing...' : 'Confirm & Sign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaseMessageCard;
