
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save, X, Calendar as CalendarIcon, CreditCard, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RentSplitFormProps {
  property: any;
  onClose: () => void;
  onSaved: () => void;
}

const RentSplitForm = ({ property, onClose, onSaved }: RentSplitFormProps) => {
  const [totalRent, setTotalRent] = useState(property.monthly_rent || 0);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [tenantAmount, setTenantAmount] = useState(property.monthly_rent || 0);
  const [tenantCollectionMethod, setTenantCollectionMethod] = useState<'stripe' | 'external'>('stripe');
  const [paymentDueDate, setPaymentDueDate] = useState<Date>();
  const [leaseStartDate, setLeaseStartDate] = useState<Date | undefined>(
    property.lease_start_date ? new Date(property.lease_start_date) : undefined
  );
  const [leaseEndDate, setLeaseEndDate] = useState<Date | undefined>(
    property.lease_end_date ? new Date(property.lease_end_date) : undefined
  );
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Fetch existing rent configuration data
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        // Fetch rent_splits for rent breakdown
        const { data: rentSplit } = await supabase
          .from('rent_splits')
          .select('*')
          .eq('property_id', property.id)
          .maybeSingle();

        if (rentSplit) {
          setIsEditing(true);
          setTotalRent(rentSplit.total_rent);
          setVoucherAmount(rentSplit.pha_portion);
          setTenantAmount(rentSplit.tenant_portion);
          // Load tenant collection method if exists
          if (rentSplit.tenant_collection_method) {
            setTenantCollectionMethod(rentSplit.tenant_collection_method as 'stripe' | 'external');
          }
        }

        // Fetch recurring_charges for due date
        const { data: recurringCharge } = await supabase
          .from('recurring_charges')
          .select('start_date')
          .eq('property_id', property.id)
          .eq('charge_type', 'rent')
          .maybeSingle();

        if (recurringCharge?.start_date) {
          const dueDay = new Date(recurringCharge.start_date).getUTCDate();
          const today = new Date();
          const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
          setPaymentDueDate(dueDateThisMonth);
        }

        // If unit_id provided, fetch unit-level lease data
        if (property.unit_id) {
          const { data: unitData } = await supabase
            .from('property_units')
            .select('monthly_rent, lease_start_date, lease_end_date')
            .eq('id', property.unit_id)
            .maybeSingle();

          if (unitData) {
            if (unitData.lease_start_date) {
              setLeaseStartDate(new Date(unitData.lease_start_date));
            }
            if (unitData.lease_end_date) {
              setLeaseEndDate(new Date(unitData.lease_end_date));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching existing rent data:', error);
      }
    };

    fetchExistingData();
  }, [property.id, property.unit_id]);

  const handleTotalRentChange = (value: number) => {
    setTotalRent(value);
    // Auto-calculate tenant amount when total changes (keeping voucher amount fixed)
    setTenantAmount(Math.max(0, value - voucherAmount));
  };

  const handleVoucherAmountChange = (value: number) => {
    setVoucherAmount(value);
    // Auto-calculate tenant amount when voucher changes
    setTenantAmount(Math.max(0, totalRent - value));
  };

  const handleTenantAmountChange = (value: number) => {
    setTenantAmount(value);
    // Auto-calculate voucher amount when tenant changes
    setVoucherAmount(Math.max(0, totalRent - value));
  };

  const handleSave = async () => {
    if (totalRent !== (voucherAmount + tenantAmount)) {
      toast({
        title: "Invalid Split",
        description: "Voucher amount + Tenant amount must equal Total rent",
        variant: "destructive"
      });
      return;
    }

    if (!paymentDueDate) {
      toast({
        title: "Payment Due Date Required",
        description: "Please select a payment due date",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const dueDay = paymentDueDate.getDate();
      console.log('Saving rent setup:', {
        propertyId: property.id,
        totalRent,
        dueDay,
        tenantCollectionMethod,
        paymentDueDate: paymentDueDate.toISOString()
      });

      // Update property with total rent, due day, and lease dates
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .update({ 
          monthly_rent: totalRent,
          rent_due_day: dueDay, // Extract day-of-month (1-31)
          lease_start_date: leaseStartDate?.toISOString().split('T')[0] || null,
          lease_end_date: leaseEndDate?.toISOString().split('T')[0] || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id)
        .select();

      if (propertyError) {
        console.error('Property update error:', propertyError);
        throw propertyError;
      }
      
      console.log('Property updated successfully:', propertyData);

      // Create or update rent split record with tenant collection method
      const { error: splitError } = await supabase
        .from('rent_splits')
        .upsert({
          property_id: property.id,
          total_rent: totalRent,
          pha_portion: voucherAmount,
          tenant_portion: tenantAmount,
          tenant_collection_method: tenantCollectionMethod,
          effective_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        });

      if (splitError) throw splitError;

      // Handle recurring charge based on collection method
      if (tenantCollectionMethod === 'stripe' && tenantAmount > 0) {
        // Create/update recurring charge for Stripe billing
        const { error: chargeError } = await supabase
          .from('recurring_charges')
          .upsert({
            property_id: property.id,
            charge_name: 'Monthly Rent',
            charge_type: 'rent',
            amount: tenantAmount,
            frequency: 'monthly',
            start_date: paymentDueDate.toISOString().split('T')[0],
            next_due_date: paymentDueDate.toISOString().split('T')[0],
            applies_to: 'tenant',
            is_active: true
          });

        if (chargeError) throw chargeError;
      } else {
        // External collection - delete any existing recurring charge
        await supabase
          .from('recurring_charges')
          .delete()
          .eq('property_id', property.id)
          .eq('charge_type', 'rent');
      }

      // If unit_id is provided, update unit-level lease data
      if (property.unit_id) {
        const { error: unitError } = await supabase
          .from('property_units')
          .update({
            monthly_rent: totalRent,
            lease_start_date: leaseStartDate?.toISOString().split('T')[0] || null,
            lease_end_date: leaseEndDate?.toISOString().split('T')[0] || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', property.unit_id);
          
        if (unitError) throw unitError;
      }

      toast({
        title: "Rent Split Saved",
        description: "Payment configuration has been updated successfully."
      });

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving rent split:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save rent split configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {isEditing ? 'Edit Rent & Payments' : 'Set Up Rent & Payments'}
              </CardTitle>
              <CardDescription>
                Configure rent amounts for {property.address}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="totalRent">Total Monthly Rent</Label>
            <Input
              id="totalRent"
              type="number"
              value={totalRent}
              onChange={(e) => handleTotalRentChange(Number(e.target.value))}
              placeholder="1200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="voucherAmount">Voucher Portion</Label>
              <Input
                id="voucherAmount"
                type="number"
                value={voucherAmount}
                onChange={(e) => handleVoucherAmountChange(Number(e.target.value))}
                placeholder="900"
              />
              <p className="text-xs text-muted-foreground mt-1">Housing voucher pays</p>
            </div>

            <div>
              <Label htmlFor="tenantAmount">Tenant Portion</Label>
              <Input
                id="tenantAmount"
                type="number"
                value={tenantAmount}
                onChange={(e) => handleTenantAmountChange(Number(e.target.value))}
                placeholder="300"
              />
              <p className="text-xs text-muted-foreground mt-1">Tenant pays</p>
            </div>
          </div>

          {/* Tenant Collection Method Selector */}
          {tenantAmount > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <Label className="text-sm font-medium">How is the tenant portion collected?</Label>
              <RadioGroup 
                value={tenantCollectionMethod} 
                onValueChange={(value) => setTenantCollectionMethod(value as 'stripe' | 'external')}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/80 transition-colors">
                  <RadioGroupItem value="stripe" id="stripe" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="stripe" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Through OpenKey (in-app / Stripe)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tenant will be billed automatically each month
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/80 transition-colors">
                  <RadioGroupItem value="external" id="external" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="external" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-amber-600" />
                      Outside OpenKey (check, bank deposit, etc.)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Track via Payment Tagging when deposit arrives
                    </p>
                  </div>
                </div>
              </RadioGroup>
              
              {/* Contextual note */}
              {tenantCollectionMethod === 'stripe' ? (
                <p className="text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 p-2 rounded">
                  <strong>Stripe billing:</strong> Tenant will be charged ${tenantAmount.toLocaleString()} through Stripe each month on the due date.
                </p>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 p-2 rounded">
                  <strong>External collection:</strong> No Stripe charge will be created. Use Payment Tagging to match the ${tenantAmount.toLocaleString()} tenant portion when you receive the bank deposit.
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="paymentDueDate">Payment Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDueDate ? (
                    format(paymentDueDate, "PPP")
                  ) : (
                    <span>Pick a due date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDueDate}
                  onSelect={setPaymentDueDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">When payment is due each month</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaseStartDate">Lease Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !leaseStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {leaseStartDate ? (
                      format(leaseStartDate, "PPP")
                    ) : (
                      <span>Select start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={leaseStartDate}
                    onSelect={setLeaseStartDate}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 2}
                    toYear={new Date().getFullYear() + 5}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="leaseEndDate">Lease End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !leaseEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {leaseEndDate ? (
                      format(leaseEndDate, "PPP")
                    ) : (
                      <span>Select end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom">
                  <Calendar
                    mode="single"
                    selected={leaseEndDate}
                    onSelect={setLeaseEndDate}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 2}
                    toYear={new Date().getFullYear() + 5}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Summary:</p>
            <p className="text-sm text-muted-foreground">
              Total: ${totalRent.toLocaleString()} = Voucher: ${voucherAmount.toLocaleString()} + Tenant: ${tenantAmount.toLocaleString()}
            </p>
            {tenantAmount > 0 && (
              <p className="text-sm text-muted-foreground">
                Tenant portion collected via: {tenantCollectionMethod === 'stripe' ? 'Stripe (in-app)' : 'External (Payment Tagging)'}
              </p>
            )}
            {paymentDueDate && (
              <p className="text-sm text-muted-foreground">
                Due Date: {format(paymentDueDate, "do 'of each month'")}
              </p>
            )}
            {leaseStartDate && leaseEndDate && (
              <p className="text-sm text-muted-foreground">
                Lease: {format(leaseStartDate, "MMM d, yyyy")} - {format(leaseEndDate, "MMM d, yyyy")}
              </p>
            )}
            {totalRent !== (voucherAmount + tenantAmount) && (
              <p className="text-sm text-destructive mt-1">
                ⚠️ Amounts don't add up correctly
              </p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentSplitForm;
