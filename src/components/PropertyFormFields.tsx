
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface PropertyFormFieldsProps {
  formData: any;
  onFieldChange: (field: string, value: any) => void;
  editingProperty?: any;
}

export const PropertyFormFields = ({
  formData,
  onFieldChange,
  editingProperty
}: PropertyFormFieldsProps) => {
  
  return (
    <div className="space-y-6">
      {/* Basic Property Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address">Property Address *</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => onFieldChange('address', e.target.value)}
            placeholder="Enter full address"
            required
          />
        </div>
        <div>
          <Label htmlFor="monthly_rent">Monthly Rent *</Label>
          <Input
            id="monthly_rent"
            type="number"
            step="0.01"
            value={formData.monthly_rent || ''}
            onChange={(e) => onFieldChange('monthly_rent', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Property Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            value={formData.bedrooms || ''}
            onChange={(e) => onFieldChange('bedrooms', parseInt(e.target.value) || null)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            step="0.5"
            value={formData.bathrooms || ''}
            onChange={(e) => onFieldChange('bathrooms', parseFloat(e.target.value) || null)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="square_feet">Square Feet</Label>
          <Input
            id="square_feet"
            type="number"
            value={formData.square_feet || ''}
            onChange={(e) => onFieldChange('square_feet', parseInt(e.target.value) || null)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Property Status and Tenant Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Property Status *</Label>
          <Select 
            value={formData.status || ''} 
            onValueChange={(value) => onFieldChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Under Maintenance</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="default_tenant_type">Default Tenant Type *</Label>
          <Select 
            value={formData.default_tenant_type || ''} 
            onValueChange={(value) => onFieldChange('default_tenant_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tenant type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="voucher">Voucher Tenant (Section 8/HAP)</SelectItem>
              <SelectItem value="market_rate">Market Rate Tenant</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            This determines the default payment structure for this property
          </p>
        </div>
      </div>

      {/* Unit Count */}
      <div>
        <Label htmlFor="unit_count">Number of Units *</Label>
        <Input
          id="unit_count"
          type="number"
          min="1"
          value={formData.unit_count || 1}
          onChange={(e) => onFieldChange('unit_count', parseInt(e.target.value) || 1)}
          placeholder="1"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Set to 1 for single-family properties, or higher for multi-unit buildings
        </p>
      </div>

      {/* Property Type */}
      <div>
        <Label htmlFor="property_type">Property Type</Label>
        <Select 
          value={formData.property_type || ''} 
          onValueChange={(value) => onFieldChange('property_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voucher Settings */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_voucher"
            checked={formData.has_voucher || false}
            onCheckedChange={(checked) => onFieldChange('has_voucher', checked)}
          />
          <Label htmlFor="has_voucher">Property accepts housing vouchers</Label>
        </div>

        {formData.has_voucher && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div>
              <Label htmlFor="min_voucher_amount">Minimum Voucher Amount</Label>
              <Input
                id="min_voucher_amount"
                type="number"
                step="0.01"
                value={formData.min_voucher_amount || ''}
                onChange={(e) => onFieldChange('min_voucher_amount', parseFloat(e.target.value) || null)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="max_voucher_amount">Maximum Voucher Amount</Label>
              <Input
                id="max_voucher_amount"
                type="number"
                step="0.01"
                value={formData.max_voucher_amount || ''}
                onChange={(e) => onFieldChange('max_voucher_amount', parseFloat(e.target.value) || null)}
                placeholder="0.00"
              />
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Property Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onFieldChange('description', e.target.value)}
          placeholder="Describe the property features, amenities, and other details..."
          rows={4}
        />
      </div>
    </div>
  );
};
