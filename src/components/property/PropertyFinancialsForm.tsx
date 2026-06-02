import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PropertyFinancialsFormProps {
  property: any;
  onSave: () => void;
  onCancel: () => void;
}

export const PropertyFinancialsForm: React.FC<PropertyFinancialsFormProps> = ({
  property,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    monthly_rent: property.monthly_rent || '',
    rent_cycle: property.rent_cycle || 'monthly',
    security_deposit_held: property.security_deposit_held || '',
    prepayments_balance: property.prepayments_balance || '',
    current_balance_due: property.current_balance_due || '',
    lease_start_date: property.lease_start_date ? new Date(property.lease_start_date) : undefined,
    lease_end_date: property.lease_end_date ? new Date(property.lease_end_date) : undefined,
    // Voucher Fields
    voucher_type: '',
    tenant_portion: '',
    hap_portion: '',
    // Property Statement Fields
    beginning_cash_balance: property.beginning_cash_balance || '',
    ending_cash_balance: property.ending_cash_balance || '',
    owner_contributions: property.owner_contributions || '',
    owner_draws: property.owner_draws || '',
    other_additions: property.other_additions || '',
    other_subtractions: property.other_subtractions || '',
    property_reserve: property.property_reserve || '',
    other_income: property.other_income || '',
    other_expenses: property.other_expenses || ''
  });

  const [saving, setSaving] = useState(false);
  const [rentSplitId, setRentSplitId] = useState<string | null>(null);

  // Fetch existing rent_split data on mount
  useEffect(() => {
    const fetchRentSplit = async () => {
      const { data, error } = await supabase
        .from('rent_splits')
        .select('*')
        .eq('property_id', property.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setRentSplitId(data.id);
        setFormData(prev => ({
          ...prev,
          monthly_rent: data.total_rent?.toString() || prev.monthly_rent,
          tenant_portion: data.tenant_portion?.toString() || '',
          hap_portion: data.pha_portion?.toString() || '',
          voucher_type: data.voucher_type || '',
        }));
      }
    };

    fetchRentSplit();
  }, [property.id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update properties table
      const updateData = {
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent.toString()) : null,
        rent_cycle: formData.rent_cycle,
        security_deposit_held: formData.security_deposit_held ? parseFloat(formData.security_deposit_held.toString()) : 0,
        prepayments_balance: formData.prepayments_balance ? parseFloat(formData.prepayments_balance.toString()) : 0,
        current_balance_due: formData.current_balance_due ? parseFloat(formData.current_balance_due.toString()) : 0,
        lease_start_date: formData.lease_start_date ? formData.lease_start_date.toISOString().split('T')[0] : null,
        lease_end_date: formData.lease_end_date ? formData.lease_end_date.toISOString().split('T')[0] : null,
        // Property Statement Fields
        beginning_cash_balance: formData.beginning_cash_balance ? parseFloat(formData.beginning_cash_balance.toString()) : 0,
        ending_cash_balance: formData.ending_cash_balance ? parseFloat(formData.ending_cash_balance.toString()) : 0,
        owner_contributions: formData.owner_contributions ? parseFloat(formData.owner_contributions.toString()) : 0,
        owner_draws: formData.owner_draws ? parseFloat(formData.owner_draws.toString()) : 0,
        other_additions: formData.other_additions ? parseFloat(formData.other_additions.toString()) : 0,
        other_subtractions: formData.other_subtractions ? parseFloat(formData.other_subtractions.toString()) : 0,
        property_reserve: formData.property_reserve ? parseFloat(formData.property_reserve.toString()) : 0,
        other_income: formData.other_income ? parseFloat(formData.other_income.toString()) : 0,
        other_expenses: formData.other_expenses ? parseFloat(formData.other_expenses.toString()) : 0
      };

      const { error: propertyError } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (propertyError) throw propertyError;

      // Upsert to rent_splits table if rent split data is provided
      if (formData.voucher_type && formData.monthly_rent) {
        const totalRent = parseFloat(formData.monthly_rent.toString());
        const tenantPortion = parseFloat(formData.tenant_portion?.toString() || '0');
        const hapPortion = parseFloat(formData.hap_portion?.toString() || '0');

        const rentSplitData = {
          property_id: property.id,
          unit_id: null, // Property-level rent split
          total_rent: totalRent,
          tenant_portion: tenantPortion,
          pha_portion: hapPortion,
          voucher_type: formData.voucher_type,
          is_active: true,
          effective_date: new Date().toISOString().split('T')[0],
        };

        if (rentSplitId) {
          // Update existing rent_split
          const { error: splitError } = await supabase
            .from('rent_splits')
            .update(rentSplitData)
            .eq('id', rentSplitId);

          if (splitError) throw splitError;
        } else {
          // Insert new rent_split
          const { data: newSplit, error: splitError } = await supabase
            .from('rent_splits')
            .insert(rentSplitData)
            .select()
            .single();

          if (splitError) throw splitError;
          if (newSplit) setRentSplitId(newSplit.id);
        }
      }

      toast.success('Property financials and rent split updated successfully');
      onSave();
    } catch (error: any) {
      console.error('Error updating property financials:', error);
      toast.error('Failed to update property financials: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Details - {property.address}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rent Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly_rent">Monthly Rent</Label>
            <Input
              id="monthly_rent"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.monthly_rent}
              onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rent_cycle">Rent Cycle</Label>
            <Select value={formData.rent_cycle} onValueChange={(value) => handleInputChange('rent_cycle', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select rent cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Financial Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="security_deposit_held">Security Deposit Held</Label>
            <Input
              id="security_deposit_held"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.security_deposit_held}
              onChange={(e) => handleInputChange('security_deposit_held', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepayments_balance">Prepayments Balance</Label>
            <Input
              id="prepayments_balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.prepayments_balance}
              onChange={(e) => handleInputChange('prepayments_balance', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_balance_due">Current Balance Due</Label>
            <Input
              id="current_balance_due"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.current_balance_due}
              onChange={(e) => handleInputChange('current_balance_due', e.target.value)}
            />
          </div>
        </div>

        {/* Lease Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Lease Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.lease_start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.lease_start_date ? (
                    format(formData.lease_start_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.lease_start_date}
                  onSelect={(date) => handleInputChange('lease_start_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Lease End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.lease_end_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.lease_end_date ? (
                    format(formData.lease_end_date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.lease_end_date}
                  onSelect={(date) => handleInputChange('lease_end_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Rent & HAP Configuration */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Rent & HAP Configuration</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure the rent split between tenant and Housing Authority Payment (HAP)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voucher_type">Voucher Type</Label>
              <Select value={formData.voucher_type} onValueChange={(value) => handleInputChange('voucher_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voucher type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Section 8">Section 8</SelectItem>
                  <SelectItem value="HCV">Housing Choice Voucher (HCV)</SelectItem>
                  <SelectItem value="VASH">Veterans Affairs (VASH)</SelectItem>
                  <SelectItem value="Project-Based">Project-Based</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant_portion">Tenant Portion</Label>
              <Input
                id="tenant_portion"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.tenant_portion}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange('tenant_portion', value);
                  const total = parseFloat(formData.monthly_rent?.toString() || '0');
                  const tenant = parseFloat(value) || 0;
                  const calculatedHAP = Math.max(0, total - tenant);
                  handleInputChange('hap_portion', calculatedHAP.toFixed(2));
                }}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hap_portion">HAP Portion</Label>
              <Input
                id="hap_portion"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.hap_portion}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange('hap_portion', value);
                  const total = parseFloat(formData.monthly_rent?.toString() || '0');
                  const hap = parseFloat(value) || 0;
                  const calculatedTenant = Math.max(0, total - hap);
                  handleInputChange('tenant_portion', calculatedTenant.toFixed(2));
                }}
              />
            </div>
          </div>

          {/* Balance Indicator */}
          {formData.monthly_rent && (formData.tenant_portion || formData.hap_portion) && (() => {
            const totalRent = parseFloat(formData.monthly_rent.toString()) || 0;
            const tenantPart = parseFloat(formData.tenant_portion?.toString() || '0');
            const hapPart = parseFloat(formData.hap_portion?.toString() || '0');
            const splitTotal = tenantPart + hapPart;
            const isBalanced = Math.abs(splitTotal - totalRent) < 0.01;
            const difference = totalRent - splitTotal;

            return (
              <div className={cn(
                "p-4 rounded-lg border-2 text-sm mt-4",
                isBalanced ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-base">
                    {isBalanced ? '✓ Rent split balanced' : '⚠️ Rent split unbalanced'}
                  </span>
                  {!isBalanced && (
                    <span className="font-semibold">
                      ${Math.abs(difference).toFixed(2)} {difference > 0 ? 'short' : 'over'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total rent:</span>
                    <span className="ml-2 font-medium">${totalRent.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Split total:</span>
                    <span className="ml-2 font-medium">${splitTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenant:</span>
                    <span className="ml-2 font-medium">
                      ${tenantPart.toFixed(2)} ({totalRent > 0 ? ((tenantPart / totalRent) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HAP:</span>
                    <span className="ml-2 font-medium">
                      ${hapPart.toFixed(2)} ({totalRent > 0 ? ((hapPart / totalRent) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Property Statement Fields */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Property Statement Data</h3>
          <p className="text-sm text-muted-foreground">
            Financial data used for property statement reports
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beginning_cash_balance">Beginning Cash Balance</Label>
              <Input
                id="beginning_cash_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.beginning_cash_balance}
                onChange={(e) => handleInputChange('beginning_cash_balance', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ending_cash_balance">Ending Cash Balance</Label>
              <Input
                id="ending_cash_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.ending_cash_balance}
                onChange={(e) => handleInputChange('ending_cash_balance', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_income">Other Income</Label>
              <Input
                id="other_income"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.other_income}
                onChange={(e) => handleInputChange('other_income', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_expenses">Other Expenses</Label>
              <Input
                id="other_expenses"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.other_expenses}
                onChange={(e) => handleInputChange('other_expenses', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_contributions">Owner Contributions</Label>
              <Input
                id="owner_contributions"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.owner_contributions}
                onChange={(e) => handleInputChange('owner_contributions', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_draws">Owner Draws</Label>
              <Input
                id="owner_draws"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.owner_draws}
                onChange={(e) => handleInputChange('owner_draws', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_additions">Other Additions</Label>
              <Input
                id="other_additions"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.other_additions}
                onChange={(e) => handleInputChange('other_additions', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_subtractions">Other Subtractions</Label>
              <Input
                id="other_subtractions"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.other_subtractions}
                onChange={(e) => handleInputChange('other_subtractions', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_reserve">Property Reserve</Label>
              <Input
                id="property_reserve"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.property_reserve}
                onChange={(e) => handleInputChange('property_reserve', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};