import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaseRenewalInitiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string;
  currentRent: number;
  currentLeaseEnd: string;
  propertyAddress: string;
  onSuccess?: () => void;
}

export const LeaseRenewalInitiationModal: React.FC<LeaseRenewalInitiationModalProps> = ({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  currentRent,
  currentLeaseEnd,
  propertyAddress,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    newRentAmount: currentRent.toString(),
    proposedLeaseEnd: new Date(new Date(currentLeaseEnd).setFullYear(new Date(currentLeaseEnd).getFullYear() + 1)).toISOString().split('T')[0],
    responseDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateContractTemplate = async (newRent: number, newLeaseEnd: string) => {
    // Fetch rent split data for breakdown
    let hapAmount = 0;
    let tenantAmount = newRent;
    
    try {
      const { data: rentSplit } = await supabase
        .from('rent_splits')
        .select('pha_portion, tenant_portion')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (rentSplit) {
        hapAmount = rentSplit.pha_portion || 0;
        tenantAmount = rentSplit.tenant_portion || newRent;
      }
    } catch (error) {
      console.error('Error fetching rent split:', error);
    }
    
    // Build rent section conditionally
    const rentSection = hapAmount > 0 
      ? `4. RENT PAYMENT BREAKDOWN:
   Total Rent: $${newRent.toLocaleString()}
   Housing Assistance (HAP) Portion: $${hapAmount.toLocaleString()}
   Tenant Portion: $${tenantAmount.toLocaleString()}`
      : `4. Monthly rent amount: $${newRent.toLocaleString()}`;
    
    return `LEASE RENEWAL AGREEMENT

Property Address: ${propertyAddress}

This Lease Renewal Agreement is entered into between:

LANDLORD: [Landlord Name]
TENANT: [Tenant Name]

TERMS OF RENEWAL:

1. Original lease expiration date: ${new Date(currentLeaseEnd).toLocaleDateString()}
2. New lease term start date: ${new Date(currentLeaseEnd).toLocaleDateString()}
3. New lease term end date: ${new Date(newLeaseEnd).toLocaleDateString()}
${rentSection}
5. All other terms and conditions of the original lease remain in effect unless modified herein.

SIGNATURES:

Landlord Signature: ___________________________  Date: __________
[Landlord Name]

Tenant Signature: ___________________________  Date: __________
[Tenant Name]`;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate dates
      const currentLeaseDate = new Date(currentLeaseEnd);
      const proposedLeaseDate = new Date(formData.proposedLeaseEnd);
      const responseDueDate = new Date(formData.responseDueDate);

      if (proposedLeaseDate <= currentLeaseDate) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "New lease end date must be after current lease end date",
        });
        return;
      }

      if (responseDueDate <= new Date()) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "Response due date must be in the future",
        });
        return;
      }

      // Check for existing active renewals
      const { data: existingRenewals } = await supabase
        .from('lease_renewals')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .in('renewal_status', ['pending', 'sent']);

      if (existingRenewals && existingRenewals.length > 0) {
        toast({
          variant: "destructive",
          title: "Active Renewal Exists",
          description: "There is already an active lease renewal for this tenant",
        });
        return;
      }

      // Create lease renewal
      const { data: renewalData, error: renewalError } = await supabase
        .from('lease_renewals')
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          current_lease_end: currentLeaseEnd,
          proposed_lease_end: formData.proposedLeaseEnd,
          new_rent_amount: parseFloat(formData.newRentAmount),
          renewal_status: 'sent',
          notice_sent_date: new Date().toISOString().split('T')[0],
          response_due_date: formData.responseDueDate,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (renewalError) throw renewalError;

      // Create contract template
      const contractTemplate = await generateContractTemplate(parseFloat(formData.newRentAmount), formData.proposedLeaseEnd);
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
        user_id: tenantId,
        title: 'Lease Renewal Offer Received',
        description: `Your landlord has sent you a lease renewal offer for ${propertyAddress}. Please review and respond.`,
        type: 'info',
        link: '/tenant/lease-renewal'
      });

      toast({
        title: "Success",
        description: "Lease renewal offer sent to tenant successfully",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();

      // Reset form
      setFormData({
        newRentAmount: currentRent.toString(),
        proposedLeaseEnd: new Date(new Date(currentLeaseEnd).setFullYear(new Date(currentLeaseEnd).getFullYear() + 1)).toISOString().split('T')[0],
        responseDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });

    } catch (error) {
      console.error('Error sending lease renewal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send lease renewal offer",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Lease Renewal Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Sending renewal offer for: <strong>{propertyAddress}</strong>
            </p>
          </div>

          <div>
            <Label htmlFor="newRent">New Monthly Rent</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="newRent"
                type="number"
                value={formData.newRentAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, newRentAmount: e.target.value }))}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="proposedEnd">New Lease End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="proposedEnd"
                type="date"
                value={formData.proposedLeaseEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedLeaseEnd: e.target.value }))}
                className="pl-10"
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="responseDate">Response Due Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="responseDate"
                type="date"
                value={formData.responseDueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, responseDueDate: e.target.value }))}
                className="pl-10"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes for Tenant (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional terms or conditions..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};