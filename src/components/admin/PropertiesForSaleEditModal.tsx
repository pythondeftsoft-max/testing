import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

interface PropertyForSale {
  id: string;
  property_id: string;
  owner_id: string;
  marketing_price: number;
  additional_details?: string;
  reason_for_sale?: string;
  timeline_for_sale?: string;
  contact_preferences?: any;
  property_condition?: string;
  selling_points?: string;
  status: string;
  admin_notes?: string;
  admin_contacted_at?: string;
  admin_contacted_by?: string;
  created_at: string;
  updated_at: string;
  properties: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
}

interface EditModalProps {
  property: PropertyForSale;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const PropertiesForSaleEditModal = ({ 
  property, 
  isOpen, 
  onClose, 
  onUpdate 
}: EditModalProps) => {
  const [formData, setFormData] = useState({
    marketing_price: property.marketing_price,
    additional_details: property.additional_details || '',
    reason_for_sale: property.reason_for_sale || '',
    timeline_for_sale: property.timeline_for_sale || '',
    property_condition: property.property_condition || '',
    selling_points: property.selling_points || '',
    status: property.status,
    admin_notes: property.admin_notes || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('properties_for_sale')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property Updated",
        description: "Property for sale details have been updated successfully",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property details",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Property for Sale
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketing_price">Marketing Price *</Label>
              <Input
                id="marketing_price"
                type="number"
                value={formData.marketing_price}
                onChange={(e) => handleInputChange('marketing_price', parseFloat(e.target.value))}
                placeholder="Enter marketing price"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_condition">Property Condition</Label>
              <Select 
                value={formData.property_condition} 
                onValueChange={(value) => handleInputChange('property_condition', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="needs_renovation">Needs Renovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reason_for_sale">Reason for Sale</Label>
              <Select 
                value={formData.reason_for_sale} 
                onValueChange={(value) => handleInputChange('reason_for_sale', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relocation">Relocation</SelectItem>
                  <SelectItem value="financial_hardship">Financial Hardship</SelectItem>
                  <SelectItem value="inheritance">Inheritance</SelectItem>
                  <SelectItem value="investment_change">Investment Strategy Change</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline_for_sale">Timeline for Sale</Label>
              <Select 
                value={formData.timeline_for_sale} 
                onValueChange={(value) => handleInputChange('timeline_for_sale', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (0-30 days)</SelectItem>
                  <SelectItem value="short_term">Short Term (1-3 months)</SelectItem>
                  <SelectItem value="medium_term">Medium Term (3-6 months)</SelectItem>
                  <SelectItem value="long_term">Long Term (6+ months)</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selling_points">Selling Points</Label>
            <Textarea
              id="selling_points"
              value={formData.selling_points}
              onChange={(e) => handleInputChange('selling_points', e.target.value)}
              placeholder="Key selling points of the property..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_details">Additional Details</Label>
            <Textarea
              id="additional_details"
              value={formData.additional_details}
              onChange={(e) => handleInputChange('additional_details', e.target.value)}
              placeholder="Any additional details about the sale..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_notes">Admin Notes (Internal)</Label>
            <Textarea
              id="admin_notes"
              value={formData.admin_notes}
              onChange={(e) => handleInputChange('admin_notes', e.target.value)}
              placeholder="Internal admin notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};