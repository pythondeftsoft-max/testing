import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface RemoveTenantButtonProps {
  propertyId: string;
  propertyAddress: string;
  tenantId: string;
  onTenantRemoved: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export const RemoveTenantButton = ({
  propertyId,
  propertyAddress,
  tenantId,
  onTenantRemoved,
  size = 'sm',
  variant = 'outline'
}: RemoveTenantButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRemoveTenant = async () => {
    setIsLoading(true);
    try {
      // Remove tenant applications first
      const { error: applicationError } = await supabase
        .from('property_applications')
        .delete()
        .eq('property_id', propertyId)
        .eq('status', 'approved');

      if (applicationError) {
        console.warn('Error removing property applications:', applicationError);
        // Don't throw here as we can still proceed
      }

      // Update property: set vacant and keep off market until manually toggled
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          tenant_id: null,
          occupancy_status: 'vacant',
          on_market: false // Keep property off market until manually toggled
        })
        .eq('id', propertyId);

      if (propertyError) {
        throw propertyError;
      }

      toast({
        title: "Tenant Removed",
        description: `Tenant has been removed from ${propertyAddress}. Property is now vacant.`,
      });

      setIsOpen(false);
      onTenantRemoved();
    } catch (error) {
      console.error('Error removing tenant:', error);
      toast({
        title: "Error",
        description: "Failed to remove tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="flex items-center gap-2">
          <UserX className="h-4 w-4" />
          Remove Tenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Tenant</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the tenant from <strong>{propertyAddress}</strong>? 
            This will mark the property as vacant and keep it off the market until you choose to list it again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRemoveTenant}
            disabled={isLoading}
          >
            {isLoading ? 'Removing...' : 'Remove Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};