import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PropertyListingToggleProps {
  propertyId: string;
  propertyAddress: string;
  currentStatus: string;
  onStatusChanged: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
}

export const PropertyListingToggle = ({
  propertyId,
  propertyAddress,
  currentStatus,
  onStatusChanged,
  size = 'sm',
  variant = 'outline'
}: PropertyListingToggleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isDeactivated = currentStatus === 'deactivated';
  const isOccupied = currentStatus === 'occupied';

  const handleToggleListing = async () => {
    setIsLoading(true);
    try {
      // Before reactivating (listing), check for geocoding and US location
      if (isDeactivated) {
        const { data: property, error: fetchError } = await supabase
          .from('properties')
          .select('latitude, longitude, address, city, state, country')
          .eq('id', propertyId)
          .single();

        if (fetchError) {
          console.error('Error checking property geocoding:', fetchError);
          toast({
            title: 'Error',
            description: 'Failed to verify property location. Please try again.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Check if property is outside US
        if (property?.country && property.country !== 'US') {
          toast({
            title: 'International Property',
            description: 'Marketplace listings are currently available for United States properties only.',
            variant: 'destructive',
          });
          setIsOpen(false);
          setIsLoading(false);
          return;
        }

        // Validate coordinates exist
        if (!property?.latitude || !property?.longitude) {
          toast({
            title: 'Missing Location',
            description: 'This property needs map coordinates before being listed. Please edit the property and update its location.',
            variant: 'destructive',
          });
          setIsOpen(false);
          setIsLoading(false);
          return;
        }
      }

      let result;
      
      if (isDeactivated) {
        // Reactivate property
        result = await supabase.rpc('reactivate_property', {
          target_property_id: propertyId,
          reactivated_by_user_id: (await supabase.auth.getUser()).data.user?.id
        });
      } else {
        // Deactivate property
        result = await supabase.rpc('deactivate_property', {
          target_property_id: propertyId,
          deactivated_by_user_id: (await supabase.auth.getUser()).data.user?.id
        });
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: isDeactivated ? "Property Listed" : "Property Unlisted",
        description: isDeactivated 
          ? `${propertyAddress} is now visible to tenants.`
          : `${propertyAddress} is no longer visible to tenants.`,
      });

      setIsOpen(false);
      onStatusChanged();
    } catch (error) {
      console.error('Error toggling property listing:', error);
      toast({
        title: "Error",
        description: "Failed to update property listing status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the button if property is occupied (can't unlist occupied properties)
  if (isOccupied) {
    return null;
  }

  const actionText = isDeactivated ? 'On Market' : 'Off Market';
  const Icon = isDeactivated ? Eye : EyeOff;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {actionText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionText}</DialogTitle>
          <DialogDescription>
            {isDeactivated ? (
              <>
                Are you sure you want to list <strong>{propertyAddress}</strong>? 
                This will make the property visible to tenants and allow new applications.
              </>
            ) : (
              <>
                Are you sure you want to take <strong>{propertyAddress}</strong> off market? 
                This will hide the property from tenant searches and prevent new applications.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant={isDeactivated ? "default" : "secondary"}
            onClick={handleToggleListing}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : actionText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};