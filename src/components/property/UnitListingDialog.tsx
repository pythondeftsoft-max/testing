import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MultiStepTenantRequestForm } from '@/components/MultiStepTenantRequestForm';

interface UnitListingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  propertyId: string;
  propertyAddress: string;
  unitData: any;
  onSuccess: () => void;
  onRefresh?: () => void;
}

export const UnitListingDialog: React.FC<UnitListingDialogProps> = ({
  isOpen,
  onClose,
  unitId,
  propertyId,
  propertyAddress,
  unitData,
  onSuccess,
  onRefresh,
}) => {
  const handleRequestSent = () => {
    onSuccess();
    onRefresh?.();
    onClose();
  };

  // Extract unit identifier for display
  const unitIdentifier = unitData?.unit_number || unitData?.unit_name || 'Unit';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 pt-4">
            <MultiStepTenantRequestForm
              propertyId={propertyId}
              propertyAddress={propertyAddress}
              unitId={unitId}
              unitNumber={unitIdentifier}
              onRequestSent={handleRequestSent}
              onCancel={onClose}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
