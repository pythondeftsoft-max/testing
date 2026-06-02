
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Users, X } from 'lucide-react';
import { MultiStepTenantRequestForm } from './MultiStepTenantRequestForm';
import { useTenantRequestUpdate } from '@/hooks/useProperties';

interface TenantRequestModalProps {
  propertyId: string;
  propertyAddress: string;
  onRequestSent: () => void;
  requestCount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDocumentAdded?: () => void;
  unitId?: string;
}

const TenantRequestModal = ({ 
  propertyId, 
  propertyAddress, 
  onRequestSent, 
  requestCount = 0, 
  open: externalOpen, 
  onOpenChange, 
  onDocumentAdded,
  unitId 
}: TenantRequestModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const tenantRequestMutation = useTenantRequestUpdate();

  // Check for active requests to show correct button
  React.useEffect(() => {
    checkActiveRequest();
  }, [propertyId]);

  const checkActiveRequest = async () => {
    try {
      let query = supabase
        .from('property_tenant_requests')
        .select('id')
        .eq('status', 'active')
        .limit(1);

      // Query by unit_id if specified, otherwise by property_id
      if (unitId) {
        query = query.eq('unit_id', unitId);
      } else {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHasActiveRequest(data && data.length > 0);
    } catch (error) {
      console.error('Error checking active request:', error);
      setHasActiveRequest(false);
    }
  };

  const handleTakeOffMarket = async () => {
    try {
      await tenantRequestMutation.mutateAsync({
        action: 'deactivate',
        propertyId,
        unitId
      });

      // Close modal and trigger parent component update
      onRequestSent();
      checkActiveRequest(); // Update button state
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Error taking property off market:', error);
    }
  };

  const handleRequestSent = () => {
    setOpen(false);
    onRequestSent();
    checkActiveRequest(); // Update button state
  };

  const handleCancel = () => {
    setOpen(false);
  };

  // Show different button based on active request status
  if (hasActiveRequest) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleTakeOffMarket}
        disabled={tenantRequestMutation.isPending}
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <X className="w-4 h-4 mr-1" />
        {tenantRequestMutation.isPending ? 'Removing...' : 'Remove Listing'}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Request Tenant
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Request Qualified Tenant
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4">
            <div className="bg-white rounded-lg">
              <MultiStepTenantRequestForm
                propertyId={propertyId}
                propertyAddress={propertyAddress}
                unitId={unitId}
                onRequestSent={handleRequestSent}
                onCancel={handleCancel}
                onDocumentAdded={onDocumentAdded}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TenantRequestModal;
