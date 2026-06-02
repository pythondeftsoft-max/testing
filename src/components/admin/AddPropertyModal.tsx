import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import { Plus, Building2, Users } from 'lucide-react';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
}

interface Portfolio {
  id: string;
  client_name: string;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logPropertyAccess } = useAdminAudit();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zipcode: '',
    property_type: 'residential',
    bedrooms: '',
    bathrooms: '',
    square_footage: '',
    monthly_rent: '',
    deposit_amount: '',
    description: '',
    owner_id: '',
    portfolio_id: '',
    status: 'available'
  });

  // Fetch owners
  const { data: owners = [] } = useQuery({
    queryKey: ['property-owners'],
    queryFn: async (): Promise<Owner[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .eq('user_type', 'landlord')
        .order('first_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Fetch portfolios
  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async (): Promise<Portfolio[]> => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, client_name')
        .order('client_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address || !formData.owner_id) {
      toast({
        title: "Validation Error",
        description: "Address and owner are required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const propertyData: any = {
        address: formData.address,
        city: formData.city || null,
        state: formData.state || null,
        zipcode: formData.zipcode || null,
        property_type: formData.property_type,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        description: formData.description || null,
        owner_id: formData.owner_id,
        portfolio_id: formData.portfolio_id || null,
        status: formData.status,
        on_market: formData.status === 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) throw error;

      // Log property creation in audit trail
      await logPropertyAccess(data.id, 'create');

      toast({
        title: "Property Added",
        description: `Property at ${formData.address} has been successfully added.`
      });

      // Reset form
      setFormData({
        address: '',
        city: '',
        state: '',
        zipcode: '',
        property_type: 'residential',
        bedrooms: '',
        bathrooms: '',
        square_footage: '',
        monthly_rent: '',
        deposit_amount: '',
        description: '',
        owner_id: '',
        portfolio_id: '',
        status: 'available'
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });

      onClose();
    } catch (error: any) {
      console.error('Error adding property:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Property Information
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="zipcode">ZIP Code</Label>
                  <Input
                    id="zipcode"
                    value={formData.zipcode}
                    onChange={(e) => handleInputChange('zipcode', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="square_footage">Square Footage</Label>
                <Input
                  id="square_footage"
                  type="number"
                  value={formData.square_footage}
                  onChange={(e) => handleInputChange('square_footage', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_rent">Monthly Rent</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  step="0.01"
                  value={formData.monthly_rent}
                  onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="deposit_amount">Deposit Amount</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ownership & Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_id">Owner *</Label>
                <Select value={formData.owner_id} onValueChange={(value) => handleInputChange('owner_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.company_name || `${owner.first_name} ${owner.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="portfolio_id">Portfolio (Optional)</Label>
                <Select value={formData.portfolio_id} onValueChange={(value) => handleInputChange('portfolio_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Portfolio</SelectItem>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Property description, amenities, etc."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding Property...' : 'Add Property'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};