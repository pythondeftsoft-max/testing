import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CommercialPropertyData } from '@/types/commercial';

interface CommercialLeaseStructureProps {
  formData: CommercialPropertyData;
  updateFormData: (field: keyof CommercialPropertyData, value: any) => void;
}

export const CommercialLeaseStructure = ({ formData, updateFormData }: CommercialLeaseStructureProps) => {
  return (
    <div className="space-y-6">
      {/* Lease Type & Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Type & Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="lease_type">Lease Type</Label>
            <Select 
              value={formData.lease_type || 'gross'} 
              onValueChange={(value) => updateFormData('lease_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gross">Gross Lease</SelectItem>
                <SelectItem value="net">Net Lease</SelectItem>
                <SelectItem value="modified_gross">Modified Gross</SelectItem>
                <SelectItem value="triple_net">Triple Net (NNN)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Determines how operating expenses are allocated between landlord and tenant
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cam_recoverable"
              checked={formData.cam_recoverable}
              onCheckedChange={(checked) => updateFormData('cam_recoverable', checked)}
            />
            <Label htmlFor="cam_recoverable">CAM charges are recoverable from tenants</Label>
          </div>
        </CardContent>
      </Card>

      {/* Operating Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Expenses (Per Square Foot)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cam_charges">CAM Charges ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                id="cam_charges"
                value={formData.cam_charges || ''}
                onChange={(e) => updateFormData('cam_charges', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 3.25"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Common Area Maintenance charges
              </p>
            </div>

            <div>
              <Label htmlFor="tax_rate_psf">Property Tax Rate ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                id="tax_rate_psf"
                value={formData.tax_rate_psf || ''}
                onChange={(e) => updateFormData('tax_rate_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 2.50"
              />
            </div>

            <div>
              <Label htmlFor="insurance_rate_psf">Insurance Rate ($/sq ft)</Label>
              <Input
                type="number"
                step="0.01"
                id="insurance_rate_psf"
                value={formData.insurance_rate_psf || ''}
                onChange={(e) => updateFormData('insurance_rate_psf', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 1.25"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Lease Type Guide:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Gross Lease:</strong> Landlord pays all operating expenses</li>
              <li><strong>Net Lease:</strong> Tenant pays property taxes</li>
              <li><strong>Modified Gross:</strong> Shared responsibility for expenses</li>
              <li><strong>Triple Net (NNN):</strong> Tenant pays taxes, insurance, and CAM</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};