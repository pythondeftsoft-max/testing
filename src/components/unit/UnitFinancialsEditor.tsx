import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  Home, 
  Calendar,
  Receipt,
  Wrench,
  Shield,
  FileText,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnitFinancialsEditorProps {
  unit: any;
  onSave: (updatedData?: any) => void;
  onCancel: () => void;
}

export const UnitFinancialsEditor = ({ unit, onSave, onCancel }: UnitFinancialsEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    monthly_rent: unit.monthly_rent || 0,
    security_deposit_amount: unit.security_deposit_amount || 0,
    additional_income: unit.additional_income || 0,
    utility_costs: unit.utility_costs || 0,
    maintenance_costs: unit.maintenance_costs || 0,
    insurance_allocation: unit.insurance_allocation || 0,
    property_tax_allocation: unit.property_tax_allocation || 0,
    management_fee_allocation: unit.management_fee_allocation || 0,
    lease_start_date: unit.lease_start_date || '',
    lease_end_date: unit.lease_end_date || '',
    tenant_portion: unit.tenant_portion || 0,
    pha_portion: unit.pha_portion || 0,
    tenant_type: unit.tenant_type || 'market',
    voucher_type: unit.voucher_type || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field.includes('date') || field === 'tenant_type' || field === 'voucher_type' 
        ? value 
        : parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('property_units')
        .update(formData)
        .eq('id', unit.id);

      if (error) throw error;

      toast({
        title: "Financial data updated",
        description: `Unit ${unit.unit_number} financials have been saved successfully.`,
      });

      onSave(formData);
    } catch (error) {
      console.error('Error updating unit financials:', error);
      toast({
        title: "Error updating financials",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Tenant Type Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Tenant Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_type">Expected Tenant Type</Label>
              <Select
                value={formData.tenant_type}
                onValueChange={(value) => handleInputChange('tenant_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Rate</SelectItem>
                  <SelectItem value="voucher">Housing Voucher</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set this to track expected rent splits even for vacant units
              </p>
            </div>
            
            {formData.tenant_type === 'voucher' && (
              <div className="space-y-2">
                <Label htmlFor="voucher_type">Voucher Type</Label>
                <Select
                  value={formData.voucher_type}
                  onValueChange={(value) => handleInputChange('voucher_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voucher type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section8">Section 8 (HCV)</SelectItem>
                    <SelectItem value="vash">VASH</SelectItem>
                    <SelectItem value="project_based">Project-Based</SelectItem>
                    <SelectItem value="emergency">Emergency Housing Voucher</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Income & Revenue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Income & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_rent">Monthly Rent (Contract Rent)</Label>
              <Input
                id="monthly_rent"
                type="number"
                step="0.01"
                value={formData.monthly_rent}
                onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional_income">Additional Income</Label>
              <Input
                id="additional_income"
                type="number"
                step="0.01"
                value={formData.additional_income}
                onChange={(e) => handleInputChange('additional_income', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          {formData.tenant_type === 'voucher' && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pha_portion">HAP Portion (PHA Pays)</Label>
                  <Input
                    id="pha_portion"
                    type="number"
                    step="0.01"
                    value={formData.pha_portion}
                    onChange={(e) => handleInputChange('pha_portion', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant_portion">Tenant Portion</Label>
                  <Input
                    id="tenant_portion"
                    type="number"
                    step="0.01"
                    value={formData.tenant_portion}
                    onChange={(e) => handleInputChange('tenant_portion', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                HAP + Tenant Portion should equal the Monthly Rent
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lease & Deposits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Lease & Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="security_deposit_amount">Security Deposit</Label>
              <Input
                id="security_deposit_amount"
                type="number"
                step="0.01"
                value={formData.security_deposit_amount}
                onChange={(e) => handleInputChange('security_deposit_amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_start_date">Lease Start Date</Label>
              <Input
                id="lease_start_date"
                type="date"
                value={formData.lease_start_date}
                onChange={(e) => handleInputChange('lease_start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_end_date">Lease End Date</Label>
              <Input
                id="lease_end_date"
                type="date"
                value={formData.lease_end_date}
                onChange={(e) => handleInputChange('lease_end_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Expenses & Allocations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Operating Expenses & Allocations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="utility_costs" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Utility Costs
              </Label>
              <Input
                id="utility_costs"
                type="number"
                step="0.01"
                value={formData.utility_costs}
                onChange={(e) => handleInputChange('utility_costs', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance_costs" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance Costs
              </Label>
              <Input
                id="maintenance_costs"
                type="number"
                step="0.01"
                value={formData.maintenance_costs}
                onChange={(e) => handleInputChange('maintenance_costs', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurance_allocation" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Insurance Allocation
              </Label>
              <Input
                id="insurance_allocation"
                type="number"
                step="0.01"
                value={formData.insurance_allocation}
                onChange={(e) => handleInputChange('insurance_allocation', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_tax_allocation" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Property Tax Allocation
              </Label>
              <Input
                id="property_tax_allocation"
                type="number"
                step="0.01"
                value={formData.property_tax_allocation}
                onChange={(e) => handleInputChange('property_tax_allocation', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management_fee_allocation" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Management Fee Allocation
              </Label>
              <Input
                id="management_fee_allocation"
                type="number"
                step="0.01"
                value={formData.management_fee_allocation}
                onChange={(e) => handleInputChange('management_fee_allocation', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};