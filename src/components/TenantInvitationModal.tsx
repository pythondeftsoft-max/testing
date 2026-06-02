
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TenantInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  unitId?: string;
  defaultTenantType: string;
  propertyAddress: string;
  landlordId: string;
}

// Generate a random invitation token
const generateInvitationToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const TenantInvitationModal = ({
  isOpen,
  onClose,
  propertyId,
  unitId,
  defaultTenantType,
  propertyAddress,
  landlordId
}: TenantInvitationModalProps) => {
  const [formData, setFormData] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantType: defaultTenantType,
    monthlyRent: '',
    tenantPortion: '',
    phaPortion: '',
    leaseStartDate: '',
    leaseEndDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const invitationToken = generateInvitationToken();

      // Create tenant invitation record with proper field mapping
      const { data, error } = await supabase
        .from('tenant_invitations')
        .insert({
          property_id: propertyId,
          unit_id: unitId || null,
          landlord_id: landlordId,
          tenant_name: formData.tenantName,
          tenant_email: formData.tenantEmail,
          tenant_type: formData.tenantType,
          monthly_rent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
          tenant_portion: formData.tenantPortion ? parseFloat(formData.tenantPortion) : null,
          pha_portion: formData.phaPortion ? parseFloat(formData.phaPortion) : null,
          lease_start_date: formData.leaseStartDate || null,
          lease_end_date: formData.leaseEndDate || null,
          invitation_token: invitationToken,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Get landlord profile for the email
      const { data: landlordProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', landlordId)
        .single();

      const landlordName = landlordProfile?.company_name || 
        `${landlordProfile?.first_name || ''} ${landlordProfile?.last_name || ''}`.trim() ||
        'Your Landlord';

      // Send invitation email through edge function
      const { error: emailError } = await supabase.functions.invoke('send-tenant-invitation', {
        body: {
          tenantEmail: formData.tenantEmail,
          tenantName: formData.tenantName,
          propertyAddress,
          landlordName,
          tenantType: formData.tenantType,
          monthlyRent: formData.monthlyRent,
          tenantPortion: formData.tenantPortion,
          phaPortion: formData.phaPortion,
          invitationToken
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Still show success since the invitation was created in the database
        toast({
          title: "Invitation Created",
          description: `Tenant invitation has been created for ${formData.tenantEmail}. Email delivery may be delayed.`,
        });
      } else {
        toast({
          title: "Invitation Sent!",
          description: `Tenant invitation has been sent to ${formData.tenantEmail}`,
        });
      }

      // If unit is specified, offer to apply details immediately
      if (unitId) {
        const applyNow = window.confirm("Would you like to apply these tenant details to the unit now?");
        if (applyNow) {
          const { error: unitUpdateError } = await supabase
            .from('property_units')
            .update({
              tenant_type: formData.tenantType,
              monthly_rent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
              pha_portion: formData.phaPortion ? parseFloat(formData.phaPortion) : null,
              tenant_portion: formData.tenantPortion ? parseFloat(formData.tenantPortion) : null,
              lease_start_date: formData.leaseStartDate || null,
              lease_end_date: formData.leaseEndDate || null,
              has_voucher: formData.tenantType === 'voucher'
            })
            .eq('id', unitId);

          if (!unitUpdateError) {
            toast({
              title: "Unit Updated",
              description: "Unit financial details have been applied successfully",
            });
          }
        }
      }

      // Reset form and close modal
      setFormData({
        tenantName: '',
        tenantEmail: '',
        tenantType: defaultTenantType,
        monthlyRent: '',
        tenantPortion: '',
        phaPortion: '',
        leaseStartDate: '',
        leaseEndDate: ''
      });
      onClose();

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send tenant invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVoucherTenant = formData.tenantType === 'voucher';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Tenant</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Property: {propertyAddress}
          </div>

          <div>
            <Label htmlFor="tenantName">Tenant Name</Label>
            <Input
              id="tenantName"
              value={formData.tenantName}
              onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="tenantEmail">Tenant Email</Label>
            <Input
              id="tenantEmail"
              type="email"
              value={formData.tenantEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, tenantEmail: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="tenantType">Tenant Type</Label>
            <Select 
              value={formData.tenantType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tenantType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voucher">Voucher Tenant</SelectItem>
                <SelectItem value="market_rate">Market Rate Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="monthlyRent">Monthly Rent</Label>
            <Input
              id="monthlyRent"
              type="number"
              step="0.01"
              value={formData.monthlyRent}
              onChange={(e) => setFormData(prev => ({ ...prev, monthlyRent: e.target.value }))}
            />
          </div>

          {isVoucherTenant && (
            <>
              <div>
                <Label htmlFor="tenantPortion">Tenant Portion</Label>
                <Input
                  id="tenantPortion"
                  type="number"
                  step="0.01"
                  value={formData.tenantPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenantPortion: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phaPortion">PHA Portion</Label>
                <Input
                  id="phaPortion"
                  type="number"
                  step="0.01"
                  value={formData.phaPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, phaPortion: e.target.value }))}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="leaseStartDate">Lease Start Date</Label>
            <Input
              id="leaseStartDate"
              type="date"
              value={formData.leaseStartDate}
              onChange={(e) => setFormData(prev => ({ ...prev, leaseStartDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="leaseEndDate">Lease End Date</Label>
            <Input
              id="leaseEndDate"
              type="date"
              value={formData.leaseEndDate}
              onChange={(e) => setFormData(prev => ({ ...prev, leaseEndDate: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
