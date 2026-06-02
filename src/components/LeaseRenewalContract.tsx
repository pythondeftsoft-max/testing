import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Pen, Download, Check, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContractData {
  id: string;
  lease_renewal_id: string;
  contract_template: string;
  landlord_signature: any;
  tenant_signature: any;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  contract_status: string;
  pdf_document_path: string | null;
}

interface LeaseRenewalContractProps {
  renewalId: string;
  userType: 'landlord' | 'tenant';
  propertyAddress: string;
  currentRent: number;
  newRent?: number;
  currentLeaseEnd: string;
  newLeaseEnd?: string;
  landlordName?: string;
  tenantName?: string;
  hapPortion?: number;
  tenantPortion?: number;
  onContractUpdate?: () => void;
}

export const LeaseRenewalContract: React.FC<LeaseRenewalContractProps> = ({
  renewalId,
  userType,
  propertyAddress,
  currentRent,
  newRent,
  currentLeaseEnd,
  newLeaseEnd,
  landlordName,
  tenantName,
  hapPortion,
  tenantPortion,
  onContractUpdate
}) => {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [agreeToSign, setAgreeToSign] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContract();
  }, [renewalId]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_renewal_contracts')
        .select('*')
        .eq('lease_renewal_id', renewalId)
        .maybeSingle();

      if (error) throw error;

      if (!data && userType === 'landlord') {
        // Create new contract for landlord
        await createContract();
      } else {
        setContract(data);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load contract",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContract = async () => {
    try {
      const contractTemplate = generateContractTemplate();
      
      const { data, error } = await supabase
        .from('lease_renewal_contracts')
        .insert({
          lease_renewal_id: renewalId,
          contract_template: contractTemplate,
          contract_status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create contract",
      });
    }
  };

  const generateContractTemplate = () => {
    if (!contract) return '';
    
    let content = contract.contract_template;
    
    // Replace landlord/tenant name placeholders if still present
    content = content.replace(/\{\{landlordName\}\}/g, landlordName || '[Landlord Name]');
    content = content.replace(/\{\{tenantName\}\}/g, tenantName || '[Tenant Name]');
    
    // Replace signature lines with actual signed data
    if (contract.landlord_signature && contract.landlord_signed_at) {
      const signedName = contract.landlord_signature.name || landlordName || '[Signed]';
      const signedDate = new Date(contract.landlord_signed_at).toLocaleDateString();
      
      // Replace landlord signature line with actual signature
      content = content.replace(
        /Landlord Signature: _+\s+Date: _+/g,
        `Landlord Signature: ${signedName}  Date: ${signedDate}`
      );
      // Also replace patterns like "Landlord Signature: [Name]  Date: [Date]"
      content = content.replace(
        /Landlord Signature: [^\n]+\s+Date: [^\n]+/g,
        `Landlord Signature: ${signedName}  Date: ${signedDate}`
      );
    }
    
    if (contract.tenant_signature && contract.tenant_signed_at) {
      const signedName = contract.tenant_signature.name || tenantName || '[Signed]';
      const signedDate = new Date(contract.tenant_signed_at).toLocaleDateString();
      
      content = content.replace(
        /Tenant Signature: _+\s+Date: _+/g,
        `Tenant Signature: ${signedName}  Date: ${signedDate}`
      );
    }
    
    return content;
  };

  const handleSignature = async () => {
    if (!contract || !signatureName.trim() || !agreeToSign) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your full name and check the agreement box",
      });
      return;
    }

    setSigning(true);

    try {
      const signatureInfo = {
        name: signatureName,
        date: signatureDate,
        timestamp: new Date().toISOString()
      };

      const updateData: any = {};
      let newStatus = contract.contract_status;

      if (userType === 'landlord') {
        updateData.landlord_signature = signatureInfo;
        updateData.landlord_signed_at = new Date().toISOString();
        newStatus = 'landlord_signed';
      } else {
        updateData.tenant_signature = signatureInfo;
        updateData.tenant_signed_at = new Date().toISOString();
        newStatus = contract.landlord_signed_at ? 'completed' : 'tenant_signed';
      }

      updateData.contract_status = newStatus;
      updateData.contract_template = generateContractTemplate();

      const { error: updateError } = await supabase
        .from('lease_renewal_contracts')
        .update(updateData)
        .eq('id', contract.id);

      if (updateError) throw updateError;

      // Check if contract is now completed (both parties signed)
      const isCompleted = newStatus === 'completed' || 
        (userType === 'landlord' && contract.tenant_signed_at) ||
        (userType === 'tenant' && contract.landlord_signed_at);

      if (isCompleted) {
        // Get renewal details for completion process
        const { data: renewalData, error: renewalError } = await supabase
          .from('lease_renewals')
          .select('property_id, tenant_id, new_rent_amount, proposed_lease_end, current_lease_end')
          .eq('id', renewalId)
          .single();

        if (renewalError) throw renewalError;

        if (renewalData) {
          // Calculate the effective values
          const effectiveRent = renewalData.new_rent_amount || newRent || currentRent;
          const effectiveLeaseEnd = renewalData.proposed_lease_end || newLeaseEnd || 
            new Date(new Date(renewalData.current_lease_end).setFullYear(new Date(renewalData.current_lease_end).getFullYear() + 1)).toISOString().split('T')[0];

          // Use the new database function to complete everything atomically
          const { error: completionError } = await supabase.rpc('complete_lease_renewal', {
            p_renewal_id: renewalId,
            p_property_id: renewalData.property_id,
            p_tenant_id: renewalData.tenant_id,
            p_new_rent: effectiveRent,
            p_new_lease_end: effectiveLeaseEnd,
            p_contract_template: generateContractTemplate(),
            p_hap_portion: hapPortion || null,
            p_tenant_portion: tenantPortion || null
          });

          if (completionError) {
            console.error('Error completing lease renewal:', completionError);
            // Fallback to manual completion if function fails
            await Promise.all([
              supabase.from('properties').update({
                monthly_rent: effectiveRent,
                lease_end_date: effectiveLeaseEnd,
                lease_start_date: new Date().toISOString().split('T')[0]
              }).eq('id', renewalData.property_id),
              
              supabase.from('lease_renewals').update({
                renewal_status: 'completed'
              }).eq('id', renewalId)
            ]);
          }
        }
      }

      // Force refresh after completion
      setTimeout(async () => {
        await fetchContract();
        onContractUpdate?.();
      }, 1000);

      toast({
        title: "Contract Signed",
        description: `Contract successfully signed as ${userType}. ${isCompleted ? 'Lease renewal is now complete!' : 'Waiting for other party to sign.'}`,
      });

      // Reset form
      setSignatureName('');
      setSignatureDate(new Date().toISOString().split('T')[0]);
      setAgreeToSign(false);
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign contract",
      });
    } finally {
      setSigning(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'ready_for_signing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Pen className="w-3 h-3 mr-1" />Ready for Signing</Badge>;
      case 'landlord_signed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Check className="w-3 h-3 mr-1" />Landlord Signed</Badge>;
      case 'tenant_signed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700"><Check className="w-3 h-3 mr-1" />Tenant Signed</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Awaiting Tenant</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownloadContract = async () => {
    if (!contract) return;

    try {
      // For now, create a text file download of the signed contract
      const signedContract = generateContractTemplate();
      const blob = new Blob([signedContract], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lease_Renewal_Contract_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Your signed contract is being downloaded",
      });
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download the contract",
      });
    }
  };

  const canSign = () => {
    if (!contract) return false;
    
    if (userType === 'landlord') {
      return (contract.contract_status === 'draft' || contract.contract_status === 'ready_for_signing') && !contract.landlord_signed_at;
    } else {
      return (
        (contract.contract_status === 'ready_for_signing' || 
         contract.contract_status === 'landlord_signed' || 
         contract.contract_status === 'tenant_signed') && 
        !contract.tenant_signed_at
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading contract...</div>
        </CardContent>
      </Card>
    );
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">No contract available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lease Renewal Contract
          </CardTitle>
          {getStatusBadge(contract.contract_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Text */}
        <div className="bg-muted p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
            {generateContractTemplate()}
          </pre>
        </div>

        {/* Signature Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Landlord Signature</Label>
            {contract.landlord_signed_at ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm">Signed on {new Date(contract.landlord_signed_at).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Pending signature</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Tenant Signature</Label>
            {contract.tenant_signed_at ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm">Signed on {new Date(contract.tenant_signed_at).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Pending signature</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Digital Signature Form */}
        {canSign() && (
          <div className="space-y-4">
            <Label className="text-lg font-medium">Electronic Signature</Label>
            <div className="bg-muted border border-border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signature-name">Full Legal Name</Label>
                <Input
                  id="signature-name"
                  type="text"
                  placeholder="Enter your full legal name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signature-date">Date</Label>
                <Input
                  id="signature-date"
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agree-to-sign"
                  checked={agreeToSign}
                  onCheckedChange={(checked) => setAgreeToSign(checked as boolean)}
                />
                <Label htmlFor="agree-to-sign" className="text-sm">
                  I agree to sign this document electronically and acknowledge that this electronic signature 
                  has the same legal effect as a handwritten signature.
                </Label>
              </div>

              <Button 
                onClick={handleSignature}
                disabled={signing || !signatureName.trim() || !agreeToSign}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Pen className="w-4 h-4 mr-2" />
                {signing ? 'Signing...' : `Sign as ${userType === 'landlord' ? 'Landlord' : 'Tenant'}`}
              </Button>
            </div>
          </div>
        )}

        {/* Download Option */}
        {contract.contract_status === 'completed' && (
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDownloadContract}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Signed Contract (PDF)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};