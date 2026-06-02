
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminUnitsManager } from './AdminUnitsManager';

interface AdminUnitsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    address: string;
  };
}

export const AdminUnitsManagerDialog: React.FC<AdminUnitsManagerDialogProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Manage Units - {property.address}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] p-6 pt-4">
          <AdminUnitsManager propertyId={property.id} propertyAddress={property.address} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
