
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { CommercialPropertyData, CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import { getCommercialPropertyDefaults, isOwnerOperatedFieldReadonly, getOwnerOperatedHelpText } from '@/utils/commercialPropertyDefaults';

interface CommercialPropertyFormProps {
  initialData?: Partial<CommercialPropertyData>;
  onSubmit: (data: CommercialPropertyData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CommercialPropertyForm = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: CommercialPropertyFormProps) => {
  const [formData, setFormData] = useState<CommercialPropertyData>({
    property_type: 'commercial',
    commercial_type: initialData?.commercial_type || 'office',
    commercial_subtype: initialData?.commercial_subtype,
    asset_tags: initialData?.asset_tags || [],
    is_multi_tenant: initialData?.is_multi_tenant || false,
    lease_type: initialData?.lease_type || 'gross',
    cam_recoverable: initialData?.cam_recoverable || false,
    is_owner_operated: initialData?.is_owner_operated || false,
    source_badge: initialData?.source_badge || 'manual',
    asset_category: initialData?.asset_category || 'real_estate',
    // Required address fields
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip_code: initialData?.zip_code || '',
    ...initialData
  });

  // Auto-set owner-operated defaults when commercial type/subtype changes
  useEffect(() => {
    const defaults = getCommercialPropertyDefaults(formData.commercial_type, formData.commercial_subtype);
    setFormData(prev => ({
      ...prev,
      ...defaults
    }));
  }, [formData.commercial_type, formData.commercial_subtype]);

  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field: keyof CommercialPropertyData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.asset_tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        asset_tags: [...prev.asset_tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      asset_tags: prev.asset_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Address */}
      <Card>
        <CardHeader>
          <CardTitle>Property Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="e.g., 123 Main Street"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="e.g., Atlanta"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="e.g., GA"
                required
              />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP Code *</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                placeholder="e.g., 30309"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Type & Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Property Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commercial_type">Commercial Type</Label>
              <Select 
                value={formData.commercial_type} 
                onValueChange={(value) => handleInputChange('commercial_type', value as CommercialPropertyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="commercial_subtype">Subtype (Optional)</Label>
              <Select 
                value={formData.commercial_subtype || ''} 
                onValueChange={(value) => handleInputChange('commercial_subtype', value as CommercialSubType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subtype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="golf_course">Golf Course</SelectItem>
                  <SelectItem value="marina">Marina</SelectItem>
                  <SelectItem value="prison">Prison/Correctional</SelectItem>
                  <SelectItem value="self_storage">Self Storage</SelectItem>
                  <SelectItem value="medical">Medical Office</SelectItem>
                  <SelectItem value="shopping_center">Shopping Center</SelectItem>
                  <SelectItem value="office_building">Office Building</SelectItem>
                  <SelectItem value="warehouse_distribution">Distribution Center</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="flex_space">Flex Space</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source_badge">Source</Label>
              <Select 
                value={formData.source_badge || 'manual'} 
                onValueChange={(value) => handleInputChange('source_badge', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="parsed">Document Parsed</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="import">Bulk Import</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="asset_category">Asset Category</Label>
              <Select 
                value={formData.asset_category || 'real_estate'} 
                onValueChange={(value) => handleInputChange('asset_category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="business_holding">Business Holding</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Asset Tags */}
          <div>
            <Label>Asset Tags</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (e.g., high_yield, charterable)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.asset_tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_square_footage">Total Square Footage</Label>
              <Input
                type="number"
                value={formData.total_square_footage || ''}
                onChange={(e) => handleInputChange('total_square_footage', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 50000"
              />
            </div>

            <div>
              <Label htmlFor="leasable_square_footage">Leasable Square Footage</Label>
              <Input
                type="number"
                value={formData.leasable_square_footage || ''}
                onChange={(e) => handleInputChange('leasable_square_footage', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 45000"
              />
            </div>

            <div>
              <Label htmlFor="occupancy_rate">Current Occupancy Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.occupancy_rate || ''}
                onChange={(e) => handleInputChange('occupancy_rate', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 85"
              />
            </div>

            <div>
              <Label htmlFor="base_rent_psf">Base Rent ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_rent_psf || ''}
                onChange={(e) => handleInputChange('base_rent_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 25.50"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_multi_tenant"
              checked={formData.is_multi_tenant}
              onCheckedChange={(checked) => handleInputChange('is_multi_tenant', checked)}
            />
            <Label htmlFor="is_multi_tenant">Multi-tenant property</Label>
          </div>

          {formData.is_multi_tenant && (
            <div>
              <Label htmlFor="tenant_count">Number of Tenants</Label>
              <Input
                type="number"
                value={formData.tenant_count || ''}
                onChange={(e) => handleInputChange('tenant_count', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 12"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lease_type">Lease Type</Label>
              <Select 
                value={formData.lease_type || 'gross'} 
                onValueChange={(value) => handleInputChange('lease_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gross">Gross Lease</SelectItem>
                  <SelectItem value="net">Net Lease</SelectItem>
                  <SelectItem value="modified_gross">Modified Gross</SelectItem>
                  <SelectItem value="triple_net">Triple Net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cam_charges">CAM Charges ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cam_charges || ''}
                onChange={(e) => handleInputChange('cam_charges', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 3.25"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax_rate_psf">Tax Rate ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_rate_psf || ''}
                onChange={(e) => handleInputChange('tax_rate_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 2.50"
              />
            </div>

            <div>
              <Label htmlFor="insurance_rate_psf">Insurance Rate ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.insurance_rate_psf || ''}
                onChange={(e) => handleInputChange('insurance_rate_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 1.25"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cam_recoverable"
              checked={formData.cam_recoverable}
              onCheckedChange={(checked) => handleInputChange('cam_recoverable', checked)}
            />
            <Label htmlFor="cam_recoverable">CAM charges are recoverable from tenants</Label>
          </div>
        </CardContent>
      </Card>

      {/* Business Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Business Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_owner_operated"
                checked={formData.is_owner_operated}
                disabled={isOwnerOperatedFieldReadonly(formData.commercial_type, formData.commercial_subtype)}
                onCheckedChange={(checked) => handleInputChange('is_owner_operated', checked)}
              />
              <Label htmlFor="is_owner_operated">I operate this business (requires linked Business Holding)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {getOwnerOperatedHelpText(formData.commercial_type, formData.commercial_subtype)}
            </p>
          </div>

          {formData.is_owner_operated && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Two-Asset Model:</strong> Since you operate this business, we'll create both a Real Estate asset 
                and a linked Business Holding to track the operational performance separately.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Property Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the property features, location advantages, etc."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Private notes for your reference"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Commercial Property'}
        </Button>
      </div>
    </form>
  );
};
