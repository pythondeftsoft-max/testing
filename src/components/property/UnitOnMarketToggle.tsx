
import React, { useEffect, useState } from 'react';
import { MarketToggleSwitch } from '@/components/ui/market-toggle-switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminUnitActions } from '@/hooks/useAdminUnitActions';
import { UnitListingDialog } from './UnitListingDialog';

interface UnitOnMarketToggleProps {
  propertyId: string;
  unitId: string;
  initialOnMarket: boolean;
  unitLabel?: string;
  propertyAddress?: string;
  className?: string;
  onStatusChange?: (onMarket: boolean) => void;
  adminMode?: boolean;
  unitData?: any;
  onRefresh?: () => void;
}

export const UnitOnMarketToggle: React.FC<UnitOnMarketToggleProps> = ({
  propertyId,
  unitId,
  initialOnMarket,
  unitLabel,
  propertyAddress,
  className,
  onStatusChange,
  adminMode = false,
  unitData,
  onRefresh,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localOnMarket, setLocalOnMarket] = useState<boolean>(!!initialOnMarket);
  const [showListingDialog, setShowListingDialog] = useState(false);
  const { toast } = useToast();
  const { setUnitMarketStatus } = useAdminUnitActions();

  useEffect(() => {
    setLocalOnMarket(!!initialOnMarket);
  }, [initialOnMarket]);

  const handleToggle = async (checked: boolean) => {
    if (adminMode) {
      await handleAdminToggle(checked);
      return;
    }
    if (checked && !localOnMarket) {
      // Validate unit has bedrooms and bathrooms > 0
      const bedrooms = unitData?.bedrooms || 0;
      const bathrooms = unitData?.bathrooms || 0;
      
      if (bedrooms === 0 || bathrooms === 0) {
        toast({
          title: 'Cannot List Unit',
          description: 'Units must have at least 1 bedroom and 1 bathroom to be listed on the market. Please edit the unit first.',
          variant: 'destructive',
        });
        return;
      }
      
      // Before listing, validate property has geocoding and is in US
      const { data: property, error } = await supabase
        .from('properties')
        .select('latitude, longitude, address, city, state, country')
        .eq('id', propertyId)
        .single();

      if (error) {
        console.error('Error checking property geocoding:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify property location. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Validate coordinates exist
      // Validate property is in US for marketplace listing
      if (property?.country && property.country !== 'US') {
        toast({
          title: 'International Property',
          description: 'Marketplace listings are currently available for United States properties only.',
          variant: 'destructive',
        });
        return;
      }

      if (!property?.latitude || !property?.longitude) {
        toast({
          title: 'Missing Location',
          description: 'This property needs map coordinates before being listed. Please edit the property and click "Update Map Location".',
          variant: 'destructive',
        });
        return;
      }

      // Opening market: show listing dialog
      setShowListingDialog(true);
    } else {
      // Closing market: immediate toggle
      await handleLandlordToggle(checked);
    }
  };

  const handleAdminToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await setUnitMarketStatus.mutateAsync({
        unitId,
        onMarket: checked,
        reason: `Admin ${checked ? 'listed' : 'unlisted'} unit via dashboard`,
        metadata: { source: 'admin_dashboard', unit_label: unitLabel }
      });

      setLocalOnMarket(checked);
      onStatusChange?.(checked);
      if (checked) triggerDirectMatchCompute('property', unitId);
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLandlordToggle = async (checked: boolean) => {
    // Optimistic UI: update immediately, revert on error
    const prev = localOnMarket;
    setLocalOnMarket(checked);
    setIsUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase.rpc('toggle_unit_market_listing', {
        p_unit_id: unitId,
        p_on_market: checked,
        p_listing_data: {},
        p_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: checked ? 'Unit Listed' : 'Unit Unlisted',
        description: checked
          ? `Unit ${unitLabel || ''} is now on the market`
          : `Unit ${unitLabel || ''} has been taken off the market`,
      });

      onStatusChange?.(checked);
    } catch (err) {
      console.error('Error toggling unit market status:', err);
      setLocalOnMarket(prev); // revert
      toast({
        title: 'Error',
        description: 'Failed to update unit listing status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerDirectMatchCompute = (entityType: 'property' | 'tenant', entityId: string) => {
    supabase.functions.invoke('compute-match-queue', {
      body: { directCompute: { entity_type: entityType, entity_id: entityId } }
    }).then(({ error }) => {
      if (error) console.warn('[UnitOnMarketToggle] Direct match compute failed (non-blocking):', error);
      else console.log(`[UnitOnMarketToggle] Direct match compute triggered for ${entityType}:${entityId}`);
    });
  };

  const handleListingSuccess = () => {
    setLocalOnMarket(true);
    onStatusChange?.(true);
    triggerDirectMatchCompute('property', unitId);
  };

  return (
    <>
      <div className={`flex justify-center ${className || ''}`}>
        <MarketToggleSwitch
          id={`unit-market-toggle-${unitId}`}
          checked={localOnMarket}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          onText="On Market"
          offText="Off Market"
        />
      </div>

      {unitData && (
        <UnitListingDialog
          isOpen={showListingDialog}
          onClose={() => setShowListingDialog(false)}
          unitId={unitId}
          propertyId={propertyId}
          propertyAddress={propertyAddress || 'Property'}
          unitData={unitData}
          onSuccess={handleListingSuccess}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};

export default UnitOnMarketToggle;
