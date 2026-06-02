
import React, { useState, useEffect } from 'react';
import { MarketToggleSwitch } from '@/components/ui/market-toggle-switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MultiStepTenantRequestForm } from '../MultiStepTenantRequestForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminActions } from '@/hooks/useAdminActions';

interface OnMarketToggleProps {
  propertyId: string;
  currentOnMarket: boolean;
  propertyData?: any;
  onStatusChange: () => void;
  className?: string;
  adminMode?: boolean;
}

export const OnMarketToggle = ({ 
  propertyId, 
  currentOnMarket, 
  propertyData,
  onStatusChange,
  className,
  adminMode = false
}: OnMarketToggleProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTenantRequestForm, setShowTenantRequestForm] = useState(false);
  const [localOnMarket, setLocalOnMarket] = useState(currentOnMarket);
  const { toast } = useToast();
  const { setPropertyMarketStatus } = useAdminActions();

  // Update local state when prop changes
  useEffect(() => {
    setLocalOnMarket(currentOnMarket);
  }, [currentOnMarket]);

  const handleToggle = async (checked: boolean) => {
    // Block international properties from marketplace listing
    if (checked && propertyData?.country && propertyData.country !== 'US') {
      toast({
        title: "International Property",
        description: "Marketplace listings are currently available for United States properties only. You can still manage rent, mark for sale, and use all other features.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    // Check for pending duplicate review flag before allowing property to go on market
    if (checked) {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('pending_duplicate_review')
        .eq('id', propertyId)
        .single();

      if (propertyError) {
        console.error('Error checking property duplicate status:', propertyError);
        toast({
          title: "Error",
          description: "Failed to check property status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (propertyData?.pending_duplicate_review) {
        toast({
          title: "Property Under Review",
          description: "This property is under duplicate review and cannot be listed yet. Please contact support for assistance.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
    }

    if (checked) {
      // Both admin and landlord: show listing form for photos, links, details
      setShowTenantRequestForm(true);
    } else if (!checked) {
      // Simply turn OFF (both admin and landlord)
      if (adminMode) {
        await updateMarketStatusAdmin(false);
      } else {
        await updateMarketStatus(false);
      }
    }
  };

  const updateMarketStatus = async (onMarket: boolean) => {
    setIsUpdating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.rpc('toggle_property_market_listing', {
        p_property_id: propertyId,
        p_on_market: onMarket,
        p_user_id: user.id
      });

      if (error) throw error;

      // Update local state immediately
      setLocalOnMarket(onMarket);

      toast({
        title: onMarket ? "Property Listed" : "Property Unlisted",
        description: onMarket 
          ? "Property is now listed and visible to applicants"
          : "Property is no longer listed on the market",
      });

      // Trigger parent component refresh
      onStatusChange();
    } catch (error) {
      console.error('Error toggling market status:', error);
      
      // If this is admin mode and the landlord RPC failed, try admin override
      if (adminMode) {
        console.log('Falling back to admin override...');
        await updateMarketStatusAdmin(onMarket);
      } else {
        toast({
          title: "Error",
          description: "Failed to update listing status. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const updateMarketStatusAdmin = async (onMarket: boolean) => {
    setIsUpdating(true);
    try {
      await setPropertyMarketStatus.mutateAsync({
        propertyId,
        onMarket,
        reason: `Admin ${onMarket ? 'listed' : 'unlisted'} property via dashboard`,
        metadata: { source: 'admin_dashboard', property_address: propertyData?.address }
      });

      // Update local state immediately
      setLocalOnMarket(onMarket);
      
      // Trigger parent component refresh
      onStatusChange();
      if (onMarket) triggerDirectMatchCompute(propertyId);
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerDirectMatchCompute = (entityId: string) => {
    supabase.functions.invoke('compute-match-queue', {
      body: { directCompute: { entity_type: 'property', entity_id: entityId } }
    }).then(({ error }) => {
      if (error) console.warn('[OnMarketToggle] Direct match compute failed (non-blocking):', error);
      else console.log(`[OnMarketToggle] Direct match compute triggered for property:${entityId}`);
    });
  };

  const handleTenantRequestComplete = async () => {
    setShowTenantRequestForm(false);
    
    // For admin mode, use admin function to finalize market status
    if (adminMode) {
      await updateMarketStatusAdmin(true);
    } else {
      // The tenant request form handles its own market status update for landlords
      setLocalOnMarket(true);
      onStatusChange();
    }
    triggerDirectMatchCompute(propertyId);
  };

  const handleCancel = () => {
    setShowTenantRequestForm(false);
  };

  return (
    <>
      <div className={`flex justify-center ${className}`}>
        <MarketToggleSwitch
          id={`market-toggle-${propertyId}`}
          checked={localOnMarket}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          onText="On Market"
          offText="Off Market"
        />
      </div>

      {/* Tenant Request Modal - show for both admin and landlord when listing */}
      <Dialog open={showTenantRequestForm} onOpenChange={handleCancel}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 pt-4">
              <MultiStepTenantRequestForm
                propertyId={propertyId}
                propertyAddress={propertyData?.address || 'Property'}
                onRequestSent={handleTenantRequestComplete}
                onCancel={handleCancel}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
