import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { useToast } from '@/hooks/use-toast';
import { DollarSign, Home, MapPin } from 'lucide-react';

interface Property {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  monthly_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface ForSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  property: Property;
}

interface FormData {
  marketing_price: string;
  reason_for_sale: string;
  timeline_for_sale: string;
  property_condition: string;
  additional_details: string;
  selling_points: string;
  contact_preferences: {
    email: boolean;
    phone: boolean;
  };
}

export const ForSaleModal = ({ isOpen, onClose, onSubmit, property }: ForSaleModalProps) => {
  const getInitialFormData = (): FormData => ({
    marketing_price: property.monthly_rent ? (property.monthly_rent * 120).toString() : '',
    reason_for_sale: '',
    timeline_for_sale: '',
    property_condition: '',
    additional_details: '',
    selling_points: '',
    contact_preferences: {
      email: true,
      phone: false
    }
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactPreferenceChange = (type: 'email' | 'phone', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      contact_preferences: {
        ...prev.contact_preferences,
        [type]: checked
      }
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.marketing_price?.trim() || !formData.reason_for_sale) {
      toast({
        title: "Missing Information",
        description: "Please fill in the marketing price and reason for sale.",
        variant: "destructive"
      });
      return;
    }

    // Validate marketing price is a valid positive number
    const marketingPrice = parseFloat(formData.marketing_price.trim());
    if (isNaN(marketingPrice) || marketingPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid marketing price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    // Prepare the data to send to parent
    const saleData = {
      marketing_price: marketingPrice,
      reason_for_sale: formData.reason_for_sale,
      timeline_for_sale: formData.timeline_for_sale,
      property_condition: formData.property_condition,
      additional_details: formData.additional_details,
      selling_points: formData.selling_points,
      contact_preferences: formData.contact_preferences
    };

    // Pass the form data to parent - parent will handle the API call
    onSubmit(saleData);
    
    // Reset form
    setFormData(getInitialFormData());
    
    // Close modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Mark Property for Sale - Wholesale Opportunity
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Info Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Details
            </h3>
            <p className="text-sm text-muted-foreground">
              {property.address && `${property.address}, `}
              {property.city && property.state && `${property.city}, ${property.state}`}
            </p>
            {property.bedrooms && property.bathrooms && (
              <p className="text-sm text-muted-foreground">
                {property.bedrooms} bed / {property.bathrooms} bath
              </p>
            )}
            {property.monthly_rent && (
              <p className="text-sm text-muted-foreground">
                Current Rent: ${property.monthly_rent.toLocaleString()}/month
              </p>
            )}
          </div>

          {/* Marketing Price */}
          <div className="space-y-2">
            <Label htmlFor="marketing_price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Marketing/Asking Price *
            </Label>
            <Input
              id="marketing_price"
              type="number"
              min="0"
              step="1000"
              placeholder="Enter asking price"
              value={formData.marketing_price}
              onChange={(e) => handleInputChange('marketing_price', e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Reason for Sale */}
          <div className="space-y-2">
            <Label htmlFor="reason_for_sale">Reason for Sale *</Label>
            <Select
              value={formData.reason_for_sale}
              onValueChange={(value) => handleInputChange('reason_for_sale', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason for sale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="financial_need">Financial Need</SelectItem>
                <SelectItem value="relocation">Relocation</SelectItem>
                <SelectItem value="downsizing">Downsizing Portfolio</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="market_conditions">Market Conditions</SelectItem>
                <SelectItem value="property_management">Property Management Issues</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
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
                <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                <SelectItem value="30_days">Within 30 days</SelectItem>
                <SelectItem value="60_days">Within 60 days</SelectItem>
                <SelectItem value="90_days">Within 90 days</SelectItem>
                <SelectItem value="flexible">Flexible timing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Condition */}
          <div className="space-y-2">
            <Label htmlFor="property_condition">Property Condition</Label>
            <Select
              value={formData.property_condition}
              onValueChange={(value) => handleInputChange('property_condition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent - Move-in ready</SelectItem>
                <SelectItem value="good">Good - Minor repairs needed</SelectItem>
                <SelectItem value="fair">Fair - Some updates needed</SelectItem>
                <SelectItem value="needs_work">Needs Work - Major repairs required</SelectItem>
                <SelectItem value="fixer_upper">Fixer Upper - Significant renovation needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selling Points */}
          <div className="space-y-2">
            <Label htmlFor="selling_points">Key Selling Points</Label>
            <Textarea
              id="selling_points"
              placeholder="What makes this property attractive? (location, recent updates, rental income, etc.)"
              value={formData.selling_points}
              onChange={(e) => handleInputChange('selling_points', e.target.value)}
              rows={3}
            />
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="additional_details">Additional Details</Label>
            <Textarea
              id="additional_details"
              placeholder="Any other information about the property or sale..."
              value={formData.additional_details}
              onChange={(e) => handleInputChange('additional_details', e.target.value)}
              rows={3}
            />
          </div>

          {/* Contact Preferences */}
          <div className="space-y-3">
            <Label>Preferred Contact Method</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact_email"
                  checked={formData.contact_preferences.email}
                  onCheckedChange={(checked) => 
                    handleContactPreferenceChange('email', checked as boolean)
                  }
                />
                <Label htmlFor="contact_email" className="text-sm">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact_phone"
                  checked={formData.contact_preferences.phone}
                  onCheckedChange={(checked) => 
                    handleContactPreferenceChange('phone', checked as boolean)
                  }
                />
                <Label htmlFor="contact_phone" className="text-sm">Phone</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};