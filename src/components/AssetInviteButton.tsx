import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssetInviteButtonProps {
  assetId: string;
  assetName: string;
  portfolioId?: string;
  className?: string;
}

interface InviteFormData {
  tenantName: string;
  tenantEmail: string;
  tenantType: 'market' | 'voucher';
  monthlyRent: string;
  tenantPortion: string;
  phaPortion: string;
  leaseStartDate: string;
  leaseEndDate: string;
  propertyId: string; // Will select from dropdown
}

const AssetInviteButton = ({ assetId, assetName, portfolioId, className }: AssetInviteButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<InviteFormData>({
    tenantName: '',
    tenantEmail: '',
    tenantType: 'market',
    monthlyRent: '',
    tenantPortion: '',
    phaPortion: '',
    leaseStartDate: '',
    leaseEndDate: '',
    propertyId: ''
  });

  // Generate invitation token
  const generateInvitationToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Load properties when dialog opens
  const handleOpenDialog = async () => {
    setIsOpen(true);
    await loadProperties();
  };

  const loadProperties = async () => {
    try {
      setLoadingProperties(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('properties')
        .select('id, address, monthly_rent')
        .eq('owner_id', user.id);

      // Filter by portfolio if specified
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('address');

      if (error) throw error;
      setProperties(data || []);
      
      // Auto-select first property if only one
      if (data && data.length === 1) {
        setFormData(prev => ({
          ...prev,
          propertyId: data[0].id,
          monthlyRent: data[0].monthly_rent?.toString() || ''
        }));
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive"
      });
    } finally {
      setLoadingProperties(false);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setFormData(prev => ({
      ...prev,
      propertyId,
      monthlyRent: property?.monthly_rent?.toString() || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantName || !formData.tenantEmail || !formData.propertyId || !formData.monthlyRent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Get landlord profile
      const { data: landlordProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const selectedProperty = properties.find(p => p.id === formData.propertyId);
      if (!selectedProperty) throw new Error('Selected property not found');

      const invitationToken = generateInvitationToken();
      const landlordName = landlordProfile 
        ? `${landlordProfile.first_name || ''} ${landlordProfile.last_name || ''}`.trim()
        : 'Your landlord';

      // Call the send-tenant-invitation edge function
      const { data, error } = await supabase.functions.invoke('send-tenant-invitation', {
        body: {
          propertyId: formData.propertyId,
          tenantEmail: formData.tenantEmail,
          tenantName: formData.tenantName,
          propertyAddress: selectedProperty.address,
          landlordName,
          tenantType: formData.tenantType,
          monthlyRent: parseFloat(formData.monthlyRent),
          tenantPortion: formData.tenantType === 'voucher' ? parseFloat(formData.tenantPortion) : null,
          phaPortion: formData.tenantType === 'voucher' ? parseFloat(formData.phaPortion) : null,
          leaseStartDate: formData.leaseStartDate || null,
          leaseEndDate: formData.leaseEndDate || null,
          invitationToken
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent!",
        description: `Tenant invitation sent to ${formData.tenantEmail}${data?.correlationId ? ` (${data.correlationId})` : ''}`,
      });

      // Reset form and close dialog
      setFormData({
        tenantName: '',
        tenantEmail: '',
        tenantType: 'market',
        monthlyRent: '',
        tenantPortion: '',
        phaPortion: '',
        leaseStartDate: '',
        leaseEndDate: '',
        propertyId: ''
      });
      setIsOpen(false);

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          onClick={handleOpenDialog}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Invite to Pay
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Tenant to Pay</DialogTitle>
          <DialogDescription>
            Send an invitation for rent collection on asset: {assetName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div>
            <Label htmlFor="property">Property *</Label>
            {loadingProperties ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading properties...
              </div>
            ) : (
              <Select value={formData.propertyId} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property for rent collection" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tenant Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantName">Tenant Name *</Label>
              <Input
                id="tenantName"
                value={formData.tenantName}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                placeholder="Enter tenant name"
              />
            </div>
            <div>
              <Label htmlFor="tenantEmail">Tenant Email *</Label>
              <Input
                id="tenantEmail"
                type="email"
                value={formData.tenantEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantEmail: e.target.value }))}
                placeholder="Enter tenant email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tenantType">Tenant Type</Label>
            <Select value={formData.tenantType} onValueChange={(value: 'market' | 'voucher') => setFormData(prev => ({ ...prev, tenantType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market Rate</SelectItem>
                <SelectItem value="voucher">Section 8 Voucher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rent Details */}
          <div>
            <Label htmlFor="monthlyRent">Monthly Rent *</Label>
            <Input
              id="monthlyRent"
              type="number"
              min="0"
              step="0.01"
              value={formData.monthlyRent}
              onChange={(e) => setFormData(prev => ({ ...prev, monthlyRent: e.target.value }))}
              placeholder="Enter monthly rent amount"
            />
          </div>

          {formData.tenantType === 'voucher' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenantPortion">Tenant Portion</Label>
                <Input
                  id="tenantPortion"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tenantPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenantPortion: e.target.value }))}
                  placeholder="Tenant's portion"
                />
              </div>
              <div>
                <Label htmlFor="phaPortion">PHA Portion</Label>
                <Input
                  id="phaPortion"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.phaPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, phaPortion: e.target.value }))}
                  placeholder="PHA portion"
                />
              </div>
            </div>
          )}

          {/* Lease Dates (Optional) */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssetInviteButton;