import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle, Calendar as CalendarIcon, DollarSign, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMaintenanceVendors } from '@/hooks/useMaintenanceVendors';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface MaintenanceCompletionModalProps {
  open: boolean;
  onClose: () => void;
  request: {
    id: string;
    title: string;
    property_id: string;
    unit_id?: string;
    properties?: { address: string };
  };
  portfolioId?: string;
  onCompleted?: () => void;
}

const MaintenanceCompletionModal = ({
  open,
  onClose,
  request,
  portfolioId,
  onCompleted
}: MaintenanceCompletionModalProps) => {
  const [vendorId, setVendorId] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [completedDate, setCompletedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { vendors } = useMaintenanceVendors(portfolioId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update maintenance request
      const updateData: any = {
        status: 'completed',
        completed_date: completedDate.toISOString(),
      };

      if (cost && parseFloat(cost) > 0) {
        updateData.actual_cost = parseFloat(cost);
      }

      if (vendorId && vendorId !== 'none') {
        updateData.assigned_vendor_id = vendorId;
      }

      if (notes.trim()) {
        updateData.resolution_notes = notes.trim();
      }

      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', request.id);

      if (updateError) throw updateError;

      // If cost > 0, record vendor payment
      if (cost && parseFloat(cost) > 0 && vendorId && vendorId !== 'none') {
        const { data: userData } = await supabase.auth.getUser();
        const selectedVendor = vendors.find(v => v.id === vendorId);
        if (userData?.user && selectedVendor) {
          const { error: paymentError } = await supabase
            .from('vendor_payment_records')
            .insert({
              vendor_id: vendorId,
              property_id: request.property_id,
              unit_id: request.unit_id || null,
              maintenance_request_id: request.id,
              amount: parseFloat(cost),
              paid_at: completedDate.toISOString(),
              payment_method: 'manual',
              created_by: userData.user.id,
              landlord_id: userData.user.id,
              recipient_name: selectedVendor.company_name || 'Unknown Vendor',
              recipient_type: 'vendor',
              memo: notes.trim() || null,
            });

          if (paymentError) {
            console.error('Error recording payment:', paymentError);
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unit-maintenance-requests'] });

      toast({
        title: 'Request Completed',
        description: 'Maintenance request has been marked as complete.',
      });

      onCompleted?.();
      onClose();
      
      // Reset form
      setVendorId('');
      setCost('');
      setCompletedDate(new Date());
      setNotes('');
    } catch (error) {
      console.error('Error completing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete maintenance request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Mark Request Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium">{request.title}</p>
            <p className="text-sm text-muted-foreground">
              {request.properties?.address || 'Unknown Property'}
            </p>
          </div>

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendor" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Vendor (Optional)
            </Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vendor</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost (Optional)
            </Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Completed
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !completedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completedDate ? format(completedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completedDate}
                  onSelect={(date) => date && setCompletedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Resolution notes, work performed, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceCompletionModal;
