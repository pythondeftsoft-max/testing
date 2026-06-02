import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreditCard, Landmark, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InviteTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  propertyAddress: string;
}

export const InviteTenantModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  propertyAddress 
}: InviteTenantModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tenantType: 'market_rate',
    rent: '',
    tenantPortion: '',
    phaPortion: '',
    leaseStartDate: '',
    leaseEndDate: '',
    tenantCollectionMethod: 'stripe' as 'stripe' | 'external',
  });
  const [paymentDueDate, setPaymentDueDate] = useState<Date | undefined>();

  const isVoucherTenant = formData.tenantType === 'voucher';

  // Auto-calculate tenant portion when rent or PHA portion changes for voucher tenants
  useEffect(() => {
    if (isVoucherTenant && formData.rent && formData.phaPortion) {
      const rent = parseFloat(formData.rent) || 0;
      const phaPortion = parseFloat(formData.phaPortion) || 0;
      const calculatedTenantPortion = Math.max(0, rent - phaPortion);
      setFormData(prev => ({ ...prev, tenantPortion: String(calculatedTenantPortion) }));
    }
  }, [formData.rent, formData.phaPortion, isVoucherTenant]);

  // Reset voucher fields when switching tenant type
  useEffect(() => {
    if (!isVoucherTenant) {
      setFormData(prev => ({ ...prev, tenantPortion: '', phaPortion: '' }));
    }
  }, [isVoucherTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit({
        ...formData,
        paymentDueDate: paymentDueDate?.toISOString().split('T')[0],
      });
      // Reset form
      setFormData({
        name: '',
        email: '',
        tenantType: 'market_rate',
        rent: '',
        tenantPortion: '',
        phaPortion: '',
        leaseStartDate: '',
        leaseEndDate: '',
        tenantCollectionMethod: 'stripe',
      });
      setPaymentDueDate(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate tenant portion for display
  const getTenantPortionDisplay = () => {
    if (isVoucherTenant) {
      return formData.tenantPortion || '0';
    }
    return formData.rent || '0';
  };

  const tenantPortionDisplay = getTenantPortionDisplay();
  const showCollectionMethod = parseFloat(tenantPortionDisplay) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Tenant</DialogTitle>
          <DialogDescription>
            Invite a tenant to <strong>{propertyAddress}</strong>. This will mark the property as occupied.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Info - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenant_name">Tenant Name</Label>
              <Input
                id="tenant_name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="tenant_email">Email Address</Label>
              <Input
                id="tenant_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          {/* Tenant Type & Monthly Rent - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenant_type">Tenant Type</Label>
              <Select 
                value={formData.tenantType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, tenantType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voucher">Voucher Tenant</SelectItem>
                  <SelectItem value="market_rate">Market Rate Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rent_amount">Monthly Rent ($)</Label>
              <Input
                id="rent_amount"
                type="number"
                step="0.01"
                value={formData.rent}
                onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
                placeholder="2500"
                required
              />
            </div>
          </div>

          {/* Voucher: PHA & Tenant Portion - Two columns */}
          {isVoucherTenant && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pha_portion">PHA Portion ($)</Label>
                <Input
                  id="pha_portion"
                  type="number"
                  step="0.01"
                  value={formData.phaPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, phaPortion: e.target.value }))}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label htmlFor="tenant_portion">Tenant Portion ($)</Label>
                <Input
                  id="tenant_portion"
                  type="number"
                  step="0.01"
                  value={formData.tenantPortion}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenantPortion: e.target.value }))}
                  placeholder="500"
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
              </div>
            </div>
          )}

          {/* Tenant Collection Method */}
          {showCollectionMethod && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <Label className="text-sm font-medium">How is the tenant portion collected?</Label>
              <RadioGroup 
                value={formData.tenantCollectionMethod} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, tenantCollectionMethod: value as 'stripe' | 'external' }))}
                className="grid grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors",
                  formData.tenantCollectionMethod === 'stripe' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/80"
                )}>
                  <RadioGroupItem value="stripe" id="stripe" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="stripe" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Through OpenKey
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Billed automatically via Stripe
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors",
                  formData.tenantCollectionMethod === 'external' ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30" : "border-border hover:bg-muted/80"
                )}>
                  <RadioGroupItem value="external" id="external" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="external" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-amber-600" />
                      Outside OpenKey
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Check, bank deposit, etc.
                    </p>
                  </div>
                </div>
              </RadioGroup>
              
              {/* Contextual note */}
              {formData.tenantCollectionMethod === 'stripe' ? (
                <p className="text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 p-2 rounded">
                  <strong>Stripe:</strong> Tenant will be charged ${tenantPortionDisplay}/mo on the due date.
                </p>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 p-2 rounded">
                  <strong>External:</strong> Use Payment Tagging to match ${tenantPortionDisplay} when deposit arrives.
                </p>
              )}
            </div>
          )}

          {/* Payment Due Date & Lease Start - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDueDate ? format(paymentDueDate, "PPP") : "Pick due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDueDate}
                    onSelect={setPaymentDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="lease_start_date">Lease Start Date</Label>
              <Input
                id="lease_start_date"
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, leaseStartDate: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Lease End Date */}
          <div className="w-1/2 pr-2">
            <Label htmlFor="lease_end_date">Lease End Date</Label>
            <Input
              id="lease_end_date"
              type="date"
              value={formData.leaseEndDate}
              onChange={(e) => setFormData(prev => ({ ...prev, leaseEndDate: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Inviting...' : 'Invite Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
