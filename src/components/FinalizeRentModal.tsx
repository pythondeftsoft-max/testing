import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, X } from 'lucide-react';

interface FinalizeRentModalProps {
  property: any;
  tenantName: string;
  applicationId: string;
  onClose: () => void;
  onSaved: () => void;
}

const FinalizeRentModal = ({ property, tenantName, applicationId, onClose, onSaved }: FinalizeRentModalProps) => {
  const [totalRent, setTotalRent] = useState(property.monthly_rent || 0);
  const [hapAmount, setHapAmount] = useState(0);
  const [tenantAmount, setTenantAmount] = useState(property.monthly_rent || 0);
  const [hapPaymentDay, setHapPaymentDay] = useState('1');
  const [tenantPaymentDay, setTenantPaymentDay] = useState('1');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleTotalRentChange = (value: number) => {
    setTotalRent(value);
    // Auto-calculate tenant amount when total changes (keeping HAP amount fixed)
    setTenantAmount(Math.max(0, value - hapAmount));
  };

  const handleHapAmountChange = (value: number) => {
    setHapAmount(value);
    // Auto-calculate tenant amount when HAP changes
    setTenantAmount(Math.max(0, totalRent - value));
  };

  const handleTenantAmountChange = (value: number) => {
    setTenantAmount(value);
    // Auto-calculate HAP amount when tenant changes
    setHapAmount(Math.max(0, totalRent - value));
  };

  const generateDayOptions = () => {
    return Array.from({ length: 28 }, (_, i) => (i + 1).toString());
  };

  const handleSave = async () => {
    // Validation
    if (Math.abs(totalRent - (hapAmount + tenantAmount)) > 0.01) {
      toast({
        title: "Invalid Split",
        description: "HAP amount + Tenant amount must equal Total rent",
        variant: "destructive"
      });
      return;
    }

    if (totalRent <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Total rent must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      // Update property with total rent
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ 
          monthly_rent: totalRent,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);

      if (propertyError) throw propertyError;

      // Create or update rent split record with payment days
      const { error: splitError } = await supabase
        .from('rent_splits')
        .upsert({
          property_id: property.id,
          total_rent: totalRent,
          pha_portion: hapAmount,
          tenant_portion: tenantAmount,
          hap_payment_day: parseInt(hapPaymentDay),
          tenant_payment_day: parseInt(tenantPaymentDay),
          effective_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        });

      if (splitError) throw splitError;

      toast({
        title: "Rent Details Finalized",
        description: "Payment configuration has been saved successfully."
      });

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving rent details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save rent details",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Finalize Rent Details
              </CardTitle>
              <CardDescription>
                Set final rent amounts for {tenantName} at {property.address}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Enter the final rent breakdown as determined by Section 8 after their inspection and approval.
            </p>
          </div>

          <div>
            <Label htmlFor="totalRent">Total Monthly Rent</Label>
            <Input
              id="totalRent"
              type="number"
              value={totalRent}
              onChange={(e) => handleTotalRentChange(Number(e.target.value))}
              placeholder="1200"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">Full rent amount for the property</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hapAmount">HAP Amount</Label>
              <Input
                id="hapAmount"
                type="number"
                value={hapAmount}
                onChange={(e) => handleHapAmountChange(Number(e.target.value))}
                placeholder="900"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">What Section 8 will pay</p>
            </div>

            <div>
              <Label htmlFor="tenantAmount">Tenant Amount</Label>
              <Input
                id="tenantAmount"
                type="number"
                value={tenantAmount}
                onChange={(e) => handleTenantAmountChange(Number(e.target.value))}
                placeholder="300"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground mt-1">What tenant will pay</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hapPaymentDay">HAP Payment Day</Label>
              <Select value={hapPaymentDay} onValueChange={setHapPaymentDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {generateDayOptions().map(day => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Day of month HAP pays</p>
            </div>

            <div>
              <Label htmlFor="tenantPaymentDay">Tenant Payment Day</Label>
              <Select value={tenantPaymentDay} onValueChange={setTenantPaymentDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {generateDayOptions().map(day => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Day of month tenant pays</p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium">Summary:</p>
            <p className="text-sm text-muted-foreground">
              Total: ${totalRent.toFixed(2)} = HAP: ${hapAmount.toFixed(2)} + Tenant: ${tenantAmount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              HAP pays on the {hapPaymentDay}th, Tenant pays on the {tenantPaymentDay}th
            </p>
            {Math.abs(totalRent - (hapAmount + tenantAmount)) > 0.01 && (
              <p className="text-sm text-destructive mt-1">
                ⚠️ Amounts don't add up correctly
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || Math.abs(totalRent - (hapAmount + tenantAmount)) > 0.01} 
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save & Approve'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalizeRentModal;
