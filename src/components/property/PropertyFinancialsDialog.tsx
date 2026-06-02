import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PropertyFinancialsForm } from './PropertyFinancialsForm';

interface PropertyFinancialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
  onSave: () => void;
}

export const PropertyFinancialsDialog: React.FC<PropertyFinancialsDialogProps> = ({
  isOpen,
  onClose,
  property,
  onSave,
}) => {
  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            Edit Financial Details - {property?.address}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] p-6 pt-4">
          <PropertyFinancialsForm
            property={property}
            onSave={handleSave}
            onCancel={onClose}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};