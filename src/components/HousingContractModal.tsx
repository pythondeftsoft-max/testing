import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface HousingContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractSigned: () => void;
  propertyAddress: string;
}

const HousingContractModal = ({ open, onOpenChange, onContractSigned, propertyAddress }: HousingContractModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const contractText = `
HOUSING SERVICES AGREEMENT

Property Address: ${propertyAddress}

This agreement establishes the terms for requesting qualified tenants through OpenKey's tenant placement services.

1. LANDLORD RESPONSIBILITIES
   • Ensure property meets all local housing codes and regulations
   • Maintain property in habitable condition
   • Provide accurate property information and rental terms
   • Comply with fair housing laws and anti-discrimination policies
   • Respond to tenant inquiries within 48 hours

2. TENANT SCREENING
   • OpenKey will screen potential tenants based on provided criteria
   • Background checks, credit reports, and income verification will be conducted
   • Landlord reserves the right to approve or deny applications

3. RENTAL TERMS
   • Rental amount and terms as specified in tenant request
   • Security deposits and move-in requirements as per local regulations
   • Lease agreements must comply with state and local laws

4. FAIR HOUSING COMPLIANCE
   • Landlord agrees to comply with all federal, state, and local fair housing laws
   • No discrimination based on race, color, religion, sex, national origin, disability, or familial status
   • Reasonable accommodations will be made for disabled tenants

5. PROPERTY CONDITION
   • Property must pass any required inspections
   • All safety features (smoke detectors, carbon monoxide detectors) must be functional
   • Property must meet minimum habitability standards

6. TENANT PLACEMENT FEE
   • Fees as outlined in separate fee schedule
   • Payment due upon successful tenant placement

7. MARKETING AND ADVERTISING
   • OpenKey may market the property on various platforms
   • Landlord grants permission to use property photos and information

8. TERMINATION
   • Either party may terminate this agreement with 30 days notice
   • Termination does not affect existing tenant placements

By signing below, I acknowledge that I have read, understood, and agree to be bound by the terms of this Housing Services Agreement.
  `;

  const handleSubmit = async () => {
    if (!agreed || !signature.trim()) {
      toast({
        title: "Contract Required",
        description: "Please read the contract, check the agreement box, and provide your signature.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Simulate contract processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Contract Signed",
        description: "Your housing contract has been signed successfully. You can now proceed with your tenant request.",
      });
      
      // Reset form
      setAgreed(false);
      setSignature('');
      setDate(new Date().toISOString().split('T')[0]);
      
      onContractSigned();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([contractText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `housing-contract-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Housing Services Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and sign this contract before requesting tenants for: {propertyAddress}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contract Text */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <h3 className="font-medium">Contract Terms</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
            <ScrollArea className="h-64 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {contractText}
              </pre>
            </ScrollArea>
          </div>

          {/* Signature Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signature">Digital Signature *</Label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full legal name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agreement" className="text-sm">
                I have read and agree to the terms and conditions of this Housing Services Agreement
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!agreed || !signature.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Sign Contract & Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HousingContractModal;