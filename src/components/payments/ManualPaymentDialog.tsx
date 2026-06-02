import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useProperties } from '@/hooks/useProperties';
import { usePropertyTenants } from '@/hooks/usePropertyTenants';
import { useRecordManualPayment } from '@/hooks/useRecordManualPayment';
import type { ManualPaymentData } from '@/hooks/useRecordManualPayment';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';

const monthCoveredSchema = z.object({
  month: z.string().min(1, 'Month is required'),
  year: z.number().min(2020).max(2030),
});

const manualPaymentSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  paymentType: z.enum(['tenant_rent', 'hap_voucher']),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(50000, 'Amount must be less than $50,000'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentSource: z.string().min(1, 'Payment source is required'),
  monthsCovered: z.array(monthCoveredSchema).min(1, 'At least one month is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type ManualPaymentFormData = z.infer<typeof manualPaymentSchema>;

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordId: string;
  portfolioId?: string;
}

export const ManualPaymentDialog = ({ open, onOpenChange, landlordId, portfolioId }: ManualPaymentDialogProps) => {
  const { toast } = useToast();
  const { properties } = useProperties(landlordId, portfolioId);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const { data: tenants } = usePropertyTenants(selectedPropertyId ? [selectedPropertyId] : [], !!selectedPropertyId);
  const recordPayment = useRecordManualPayment();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const form = useForm<ManualPaymentFormData>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: {
      propertyId: '',
      tenantId: '',
      paymentType: 'tenant_rent',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentSource: 'cash',
      monthsCovered: [{ month: currentMonth.toString().padStart(2, '0'), year: currentYear }],
      referenceNumber: '',
      notes: '',
    },
  });

  const paymentType = form.watch('paymentType');
  const monthsCovered = form.watch('monthsCovered');

  useEffect(() => {
    if (paymentType === 'hap_voucher') {
      form.setValue('paymentSource', 'hap');
    } else if (form.getValues('paymentSource') === 'hap') {
      form.setValue('paymentSource', 'cash');
    }
  }, [paymentType, form]);

  const handleAddMonth = () => {
    const currentMonths = form.getValues('monthsCovered');
    form.setValue('monthsCovered', [...currentMonths, { month: currentMonth.toString().padStart(2, '0'), year: currentYear }]);
  };

  const handleRemoveMonth = (index: number) => {
    const currentMonths = form.getValues('monthsCovered');
    if (currentMonths.length > 1) {
      form.setValue('monthsCovered', currentMonths.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: ManualPaymentFormData) => {
    try {
      await recordPayment.mutateAsync({
        ...data,
        landlordId,
      } as ManualPaymentData);

      toast({
        title: 'Payment Recorded',
        description: 'Manual payment has been recorded successfully.',
      });

      form.reset();
      setSelectedPropertyId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Manual Payment</DialogTitle>
          <DialogDescription>
            Record a payment received outside the platform (cash, check, bank transfer, etc.)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedPropertyId(value);
                      form.setValue('tenantId', '');
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedPropertyId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.profiles.first_name} {tenant.profiles.last_name}
                          {tenant.unit_number && ` - Unit ${tenant.unit_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tenant_rent" id="tenant_rent" />
                        <Label htmlFor="tenant_rent" className="cursor-pointer">Tenant Rent Payment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hap_voucher" id="hap_voucher" />
                        <Label htmlFor="hap_voucher" className="cursor-pointer">HAP Voucher Payment</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} max={new Date().toISOString().split('T')[0]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Source *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={paymentType === 'hap_voucher'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="hap">HAP</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Months Covered *</FormLabel>
              {monthsCovered.map((month, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name={`monthsCovered.${index}.month`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`monthsCovered.${index}.year`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {monthsCovered.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveMonth(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddMonth}>
                <Plus className="mr-2 h-4 w-4" />
                Add Month
              </Button>
            </div>

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Check #, Transaction ID, Voucher #, etc." {...field} maxLength={100} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about this payment..." 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                      maxLength={500}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
