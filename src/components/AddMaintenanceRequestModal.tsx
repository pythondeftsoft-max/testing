import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Home, Wrench, Calendar } from 'lucide-react';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useMaintenanceVendors } from '@/hooks/useMaintenanceVendors';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES, CATEGORY_DISPLAY_NAMES } from '@/utils/maintenanceUtils';
import { format } from 'date-fns';

const addMaintenanceSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  unit_id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().min(1, 'Category is required'),
  status: z.literal('completed'),
  submitted_date: z.string(),
  assigned_vendor_id: z.string().optional(),
  actual_cost: z.number({ required_error: 'Cost is required' }).min(0, 'Cost must be 0 or greater'),
  notes: z.string().optional(),
});

type AddMaintenanceForm = z.infer<typeof addMaintenanceSchema>;

interface Property {
  id: string;
  address: string;
}

interface Unit {
  id: string;
  unit_number: string;
  unit_name?: string;
}

interface AddMaintenanceRequestModalProps {
  userId: string;
  portfolioId?: string;
  onRequestCreated?: () => void;
}

const AddMaintenanceRequestModal = ({ userId, portfolioId, onRequestCreated }: AddMaintenanceRequestModalProps) => {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createRequest } = useMaintenanceRequests(portfolioId);
  const { vendors } = useMaintenanceVendors(portfolioId);

  const form = useForm<AddMaintenanceForm>({
    resolver: zodResolver(addMaintenanceSchema),
    defaultValues: {
      property_id: '',
      unit_id: '',
      title: '',
      description: '',
      priority: undefined,
      category: '',
      status: 'completed',
      submitted_date: format(new Date(), 'yyyy-MM-dd'),
      assigned_vendor_id: '',
      actual_cost: 0,
      notes: '',
    },
  });

  const selectedPropertyId = form.watch('property_id');

  // Fetch properties when modal opens
  useEffect(() => {
    if (open) {
      fetchProperties();
    }
  }, [open, userId, portfolioId]);

  // Fetch units when property changes
  useEffect(() => {
    if (selectedPropertyId) {
      fetchUnits(selectedPropertyId);
    } else {
      setUnits([]);
    }
  }, [selectedPropertyId]);

  const fetchProperties = async () => {
    try {
      let query = supabase
        .from('properties')
        .select('id, address')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('address');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchUnits = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('property_units')
        .select('id, unit_number, unit_name')
        .eq('property_id', propertyId)
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
      
      // Auto-select if only one unit
      if (data && data.length === 1) {
        form.setValue('unit_id', data[0].id);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const onSubmit = async (data: AddMaintenanceForm) => {
    setLoading(true);
    try {
      const requestData: any = {
        property_id: data.property_id,
        unit_id: data.unit_id || null,
        title: data.title,
        description: data.notes ? `${data.description}\n\n**Notes:** ${data.notes}` : data.description,
        priority: data.priority,
        category: data.category,
        status: data.status,
        submitted_date: data.submitted_date,
        tenant_id: null, // Manual entry - no tenant
        assigned_vendor_id: data.assigned_vendor_id && data.assigned_vendor_id !== 'none' ? data.assigned_vendor_id : null,
      };

      // Add cost and completed date if completed
      if (data.status === 'completed') {
        requestData.actual_cost = data.actual_cost || null;
        requestData.completed_date = new Date().toISOString();
      }

      await createRequest.mutateAsync(requestData);

      toast({
        title: 'Request Added',
        description: 'Maintenance request has been added successfully.',
      });

      form.reset({
        property_id: '',
        unit_id: '',
        title: '',
        description: '',
        priority: undefined,
        category: '',
        status: 'completed',
        submitted_date: format(new Date(), 'yyyy-MM-dd'),
        assigned_vendor_id: '',
        actual_cost: 0,
        notes: '',
      });
      setOpen(false);
      onRequestCreated?.();
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      toast({
        title: 'Error',
        description: 'Failed to add maintenance request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="blue">
          <Plus className="h-4 w-4 mr-2" />
          Add Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Add Maintenance Request
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Property & Unit Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="property_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                              <SelectValue placeholder="Select property" />
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
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                          disabled={!selectedPropertyId || units.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={units.length === 0 ? "No units" : "Select unit"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.unit_name || `Unit ${unit.unit_number}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HVAC repair, Plumbing fix" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the maintenance work..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category, Priority, Status Row */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MAINTENANCE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {CATEGORY_DISPLAY_NAMES[cat as keyof typeof CATEGORY_DISPLAY_NAMES] || cat}
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MAINTENANCE_PRIORITIES.map((pri) => (
                              <SelectItem key={pri} value={pri}>
                                {pri.charAt(0).toUpperCase() + pri.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <div className="flex items-center h-10 px-3 bg-green-50 border border-green-200 rounded-md">
                      <span className="text-green-700 font-medium">Completed</span>
                    </div>
                  </FormItem>
                </div>

                {/* Date & Vendor Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="submitted_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work/Report Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assigned_vendor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor (Optional)</FormLabel>
                        <Select value={field.value || 'none'} onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Vendor</SelectItem>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.company_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cost */}
                <FormField
                  control={form.control}
                  name="actual_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="blue" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaintenanceRequestModal;
