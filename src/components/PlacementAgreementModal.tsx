import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';

interface ContractData {
  contractText: string;
  signature: string;
  signatureDate: string;
  signerName: string;
  signerRole: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UnitData {
  id: string;
  unit_number?: string;
  monthly_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface PlacementAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgreementSigned?: (contractData: ContractData) => void;
  property: any;
  unit?: UnitData; // Optional unit for multi-unit properties
  overrideRent?: number; // User-entered rent from form (takes priority)
  landlordProfile: any;
  onDocumentAdded?: () => void;
}

const PlacementAgreementModal = ({ 
  isOpen, 
  onClose, 
  onAgreementSigned,
  property,
  unit,
  overrideRent,
  landlordProfile,
  onDocumentAdded
}: PlacementAgreementModalProps) => {
  const [signature, setSignature] = useState('');
  const [signDate, setSignDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  
  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;

  const handleSignAgreement = async () => {
    if (!signature.trim()) {
      toast({
        title: "Signature Required",
        description: "Please enter your full name as your signature.",
        variant: "destructive",
      });
      return;
    }

    // Check authentication
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to sign agreements.",
        variant: "destructive",
      });
      return;
    }

    // Verify user owns the property
    if (property.owner_id !== user.id) {
      toast({
        title: "Access Denied",
        description: "You can only sign agreements for properties you own.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verify authentication session is active and get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication session expired. Please refresh the page and try again.');
      }

      console.log('Auth verification:', {
        sessionUserId: session.user.id,
        propertyOwnerId: property.owner_id,
        userMatches: session.user.id === property.owner_id
      });

      // Verify database-level property ownership
      const { data: propertyCheck, error: propertyError } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', property.id)
        .eq('owner_id', session.user.id)
        .single();

      if (propertyError || !propertyCheck) {
        throw new Error('Unable to verify property ownership. Please ensure you own this property.');
      }
      // Generate PDF using jsPDF
      const pdf = new jsPDF();
      const agreementContent = generateAgreementContent();
      
      // Split content into lines that fit the page width
      const lines = pdf.splitTextToSize(agreementContent, 170);
      
      // Add text to PDF
      pdf.setFontSize(10);
      pdf.text(lines, 20, 20);
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Generate filename with property folder structure
      const filename = `${property.id}/placement-agreement-${Date.now()}.pdf`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filename, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        if (uploadError.message?.includes('row-level security policy')) {
          throw new Error('Unable to upload document due to storage security restrictions. Please ensure you are properly authenticated and own this property.');
        } else if (uploadError.message?.includes('Unauthorized')) {
          throw new Error('Storage access denied. Please ensure you have permission to upload documents for this property.');
        }
        
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      // Store document metadata with authenticated user ID
      const { error: dbError } = await supabase
        .from('property_documents')
        .insert({
          property_id: property.id,
          uploaded_by: session.user.id, // Use session user ID for RLS
          document_type: 'placement_agreement',
          file_name: filename,
          file_path: uploadData.path,
          file_size: pdfBlob.size,
          mime_type: 'application/pdf',
          metadata: {
            signature,
            sign_date: signDate.toISOString(),
            property_address: property.address,
            unit_id: unit?.id,
            unit_number: unit?.unit_number,
            monthly_rent: unit?.monthly_rent || property.desired_rent || property.monthly_rent,
            landlord_name: `${landlordProfile.first_name} ${landlordProfile.last_name}`,
            landlord_email: landlordProfile.email
          }
        });

      if (dbError) {
        console.error('Database error details:', dbError);
        
        if (dbError.message?.includes('row-level security policy')) {
          throw new Error('Unable to save document due to security restrictions. Please ensure you are properly authenticated and own this property.');
        }
        
        throw dbError;
      }

      // Trigger document refresh if callback provided
      if (onDocumentAdded) {
        onDocumentAdded();
      }

      // Get user's IP address for audit trail
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (ipError) {
        console.warn('Failed to fetch IP address:', ipError);
      }

      // Prepare contract data for parent component
      const contractData: ContractData = {
        contractText: generateAgreementContent(),
        signature,
        signatureDate: format(signDate, 'yyyy-MM-dd'),
        signerName: `${landlordProfile.first_name} ${landlordProfile.last_name}`,
        signerRole: landlordProfile.user_type || 'landlord',
        ipAddress,
        userAgent: navigator.userAgent
      };

      // Reset form 
      setSignature('');
      setSignDate(new Date());
      
      // Trigger the agreement signed callback which will handle property listing
      if (onAgreementSigned) {
        onAgreementSigned(contractData);
      } else {
        // Fallback to close if no callback provided
        onClose();
      }
    } catch (error: any) {
      console.error('Error signing agreement:', error);
      
      let errorMessage = "Failed to sign agreement. Please try again.";
      
      if (error.message?.includes('Authentication session expired')) {
        errorMessage = "Your session has expired. Please refresh the page and try again.";
      } else if (error.message?.includes('row-level security policy')) {
        errorMessage = "Security error: Unable to save document. Please ensure you are properly authenticated.";
      } else if (error.message?.includes('property ownership')) {
        errorMessage = "Unable to verify property ownership. Please ensure you own this property.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Signing Agreement",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAgreementContent = () => {
    const todayFormatted = format(signDate, 'MMMM dd, yyyy');
    // Priority: form-entered rent > unit rent > property rent
    const monthlyRent = overrideRent || unit?.monthly_rent || property.desired_rent || property.monthly_rent || 0;
    const placementFeeAmount = (monthlyRent * placementFeePercentage) / 100;
    const formattedFeeAmount = placementFeeAmount.toFixed(2);
    
    // Unit info for display
    const unitInfo = unit?.unit_number ? `, Unit ${unit.unit_number}` : '';
    const bedrooms = unit?.bedrooms ?? property.bedrooms;
    const bathrooms = unit?.bathrooms ?? property.bathrooms;
    
    return `LANDLORD-TENANT PLACEMENT AGREEMENT

This Agreement is made on ${todayFormatted}, by and between:

Agency
OpenKey Housing LLC (hereafter referred to as 'Agency')
Contact: support@openkey.com

Landlord / Owner
Full Name: ${landlordProfile.first_name} ${landlordProfile.last_name}
Phone: ${landlordProfile.phone || 'Not provided'}
Email: ${landlordProfile.email || 'Not provided'}
Mailing Address: ${property.address}

1. Purpose
Agency agrees to locate and refer one or more qualified Section 8 voucher holders to rent available units owned by the Landlord. The Landlord agrees to compensate the Agency for each successful placement.

2. Properties & Units Covered
This agreement applies to the following available unit(s):

Property Address: ${property.address}${unitInfo}
Unit # / Description: ${bedrooms}br/${bathrooms}ba
Monthly Rent: $${monthlyRent}

*Landlord certifies that the above units are available and will notify Agency if availability changes. Additional properties may be added by mutual written agreement.

3. Placement Fee
The Landlord agrees to pay the Agency a one-time fee equal to ${placementFeePercentage}% of the first month's rent per unit successfully filled ($${formattedFeeAmount}).
The fee is due within 3 business days of lease signing or tenant move-in, whichever occurs first.
This fee applies per unit placed.
There are no recurring fees beyond initial placement.

4. Refund Policy
If a referred tenant fails to move in for reasons outside the Landlord's control, the placement fee will be fully refunded.

5. Landlord Responsibilities
The Landlord agrees to:
- Ensure each unit is rent-ready and capable of passing a Section 8 inspection.
- Communicate promptly with the Agency regarding move-in timelines, inspection scheduling, and lease execution.
- Notify the Agency immediately if a unit becomes unavailable or is rented by another party.

6. Independent Relationship
The Agency is not acting as a property manager, leasing agent, legal advisor, or maintenance provider.
The Agency's sole role is tenant placement through referral and coordination.

7. Term & Termination
This agreement remains in effect until all listed units are filled or either party terminates in writing.
Termination does not cancel fees owed for successful placements already completed.

8. Entire Agreement
This agreement reflects the full understanding between the parties and supersedes any prior verbal or written agreements.
Any changes must be made in writing and signed by both parties.

9. Signatures
Landlord Signature: ${signature}                    Date: ${todayFormatted}
Agency (OpenKey Housing LLC) Signature: OpenKey Housing LLC     Date: ${todayFormatted}

This document was electronically signed through the OpenKey platform.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Landlord-Tenant Placement Agreement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agreement Content Display */}
          <div className="bg-gray-50 p-6 rounded-lg border">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {generateAgreementContent()}
              </pre>
            </div>
          </div>

          {/* Signature Section */}
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Sign Agreement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signature">Digital Signature *</Label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full name"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  By typing your name, you agree to sign this document electronically
                </p>
              </div>

              <div>
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !signDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {signDate ? format(signDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={signDate}
                      onSelect={(date) => date && setSignDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSignAgreement}
                disabled={!signature.trim() || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Signing...' : 'Sign & Submit Agreement'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementAgreementModal;