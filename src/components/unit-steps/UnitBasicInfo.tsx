import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UnitBasicInfoProps {
  formData: {
    unit_number: string;
    unit_name: string;
    monthly_rent: string;
    bedrooms: string;
    bathrooms: string;
    square_feet: string;
    status: string;
    on_market: boolean;
  };
  updateFormData: (field: string, value: string | boolean) => void;
  isCreatingNew?: boolean;
}

export const UnitBasicInfo: React.FC<UnitBasicInfoProps> = ({
  formData,
  updateFormData,
  isCreatingNew = false,
}) => {
  // No allocation tracking needed - property totals auto-update from units
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unit Information</CardTitle>
          <CardDescription>
            Basic details about the unit including identification and physical characteristics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_number">Unit Number *</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => updateFormData('unit_number', e.target.value)}
                placeholder="e.g., 101, A, 1B"
                required
              />
            </div>
            <div>
              <Label htmlFor="unit_name">Unit Name</Label>
              <Input
                id="unit_name"
                value={formData.unit_name}
                onChange={(e) => updateFormData('unit_name', e.target.value)}
                placeholder="e.g., Studio Apartment"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => updateFormData('bedrooms', e.target.value)}
                placeholder="e.g., 2"
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => updateFormData('bathrooms', e.target.value)}
                placeholder="e.g., 1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="square_feet">Square Feet</Label>
              <Input
                id="square_feet"
                type="number"
                value={formData.square_feet}
                onChange={(e) => updateFormData('square_feet', e.target.value)}
                placeholder="e.g., 850"
              />
            </div>
            {!isCreatingNew && (
              <div>
                <Label htmlFor="monthly_rent">Monthly Rent</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  step="0.01"
                  value={formData.monthly_rent}
                  onChange={(e) => updateFormData('monthly_rent', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {!isCreatingNew && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => updateFormData('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-7">
                <Checkbox
                  id="on_market"
                  checked={formData.on_market}
                  onCheckedChange={(checked) => updateFormData('on_market', !!checked)}
                />
                <Label htmlFor="on_market">List on market</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};