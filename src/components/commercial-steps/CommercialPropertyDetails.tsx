import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CommercialPropertyData } from '@/types/commercial';

interface CommercialPropertyDetailsProps {
  formData: CommercialPropertyData;
  updateFormData: (field: keyof CommercialPropertyData, value: any) => void;
}

export const CommercialPropertyDetails = ({ formData, updateFormData }: CommercialPropertyDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Square Footage & Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Property Size & Occupancy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_square_footage">Total Square Footage</Label>
              <Input
                type="number"
                id="total_square_footage"
                value={formData.total_square_footage || ''}
                onChange={(e) => updateFormData('total_square_footage', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 50000"
              />
            </div>

            <div>
              <Label htmlFor="leasable_square_footage">Leasable Square Footage</Label>
              <Input
                type="number"
                id="leasable_square_footage"
                value={formData.leasable_square_footage || ''}
                onChange={(e) => updateFormData('leasable_square_footage', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 45000"
              />
            </div>

            <div>
              <Label htmlFor="occupancy_rate">Current Occupancy Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                id="occupancy_rate"
                value={formData.occupancy_rate || ''}
                onChange={(e) => updateFormData('occupancy_rate', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 85"
              />
            </div>

            <div>
              <Label htmlFor="base_rent_psf">Base Rent ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                id="base_rent_psf"
                value={formData.base_rent_psf || ''}
                onChange={(e) => updateFormData('base_rent_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 25.50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Tenant Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_multi_tenant"
              checked={formData.is_multi_tenant}
              onCheckedChange={(checked) => updateFormData('is_multi_tenant', checked)}
            />
            <Label htmlFor="is_multi_tenant">Multi-tenant property</Label>
          </div>

          {formData.is_multi_tenant && (
            <div className="mt-4">
              <Label htmlFor="tenant_count">Number of Tenants</Label>
              <Input
                type="number"
                id="tenant_count"
                value={formData.tenant_count || ''}
                onChange={(e) => updateFormData('tenant_count', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 12"
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Total number of tenant units or businesses in the property
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Property Description</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description || ''}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Describe the property features, location advantages, or other relevant details..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.notes || ''}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Private notes for internal use..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};