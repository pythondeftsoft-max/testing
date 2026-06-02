import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CommercialPropertyData } from '@/types/commercial';
import { isOwnerOperatedFieldReadonly, getOwnerOperatedHelpText } from '@/utils/commercialPropertyDefaults';

interface CommercialBusinessOperationsProps {
  formData: CommercialPropertyData;
  updateFormData: (field: keyof CommercialPropertyData, value: any) => void;
}

export const CommercialBusinessOperations = ({ formData, updateFormData }: CommercialBusinessOperationsProps) => {
  const isReadonly = isOwnerOperatedFieldReadonly(formData.commercial_type, formData.commercial_subtype);
  const helpText = getOwnerOperatedHelpText(formData.commercial_type, formData.commercial_subtype);

  return (
    <div className="space-y-6">
      {/* Owner Operations */}
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
                disabled={isReadonly}
                onCheckedChange={(checked) => updateFormData('is_owner_operated', checked)}
              />
              <Label htmlFor="is_owner_operated">
                I operate this business (requires linked Business Holding)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {helpText}
            </p>
          </div>

          {formData.is_owner_operated && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Two-Asset Model</h4>
              <p className="text-sm text-blue-800">
                Since you operate this business, we'll create both a Real Estate asset 
                and a linked Business Holding to track the operational performance separately. 
                This allows you to:
              </p>
              <ul className="text-sm text-blue-800 mt-2 ml-4 space-y-1">
                <li>• Track real estate value independently from business operations</li>
                <li>• Monitor business performance and cash flow separately</li>
                <li>• Maintain clear separation for tax and accounting purposes</li>
                <li>• Better understand your investment returns vs operational returns</li>
              </ul>
            </div>
          )}

          {!formData.is_owner_operated && (
            <div className="p-4 bg-muted border border-border rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Investment Property</h4>
              <p className="text-sm text-muted-foreground">
                This property will be tracked as a real estate investment where you 
                collect rent from tenants who operate their own businesses. Perfect for:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 space-y-1">
                <li>• Traditional commercial leasing</li>
                <li>• Passive real estate investment</li>
                <li>• Multi-tenant properties</li>
                <li>• Properties with external management</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary & Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Property Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Property Type:</span>
              <div className="text-muted-foreground">
                {formData.commercial_type} {formData.commercial_subtype && `(${formData.commercial_subtype})`}
              </div>
            </div>
            <div>
              <span className="font-medium">Address:</span>
              <div className="text-muted-foreground">
                {formData.address ? `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}` : 'Not specified'}
              </div>
            </div>
            <div>
              <span className="font-medium">Square Footage:</span>
              <div className="text-muted-foreground">
                {formData.total_square_footage ? `${formData.total_square_footage.toLocaleString()} sq ft` : 'Not specified'}
              </div>
            </div>
            <div>
              <span className="font-medium">Lease Type:</span>
              <div className="text-muted-foreground">
                {formData.lease_type || 'Not specified'}
              </div>
            </div>
            <div>
              <span className="font-medium">Multi-Tenant:</span>
              <div className="text-muted-foreground">
                {formData.is_multi_tenant ? `Yes (${formData.tenant_count || 'N/A'} tenants)` : 'No'}
              </div>
            </div>
            <div>
              <span className="font-medium">Owner-Operated:</span>
              <div className="text-muted-foreground">
                {formData.is_owner_operated ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              Review the information above and click "Add Commercial Property" to complete the setup.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};