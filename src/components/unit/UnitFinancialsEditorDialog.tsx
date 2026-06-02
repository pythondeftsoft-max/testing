import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnitFinancialsEditor } from './UnitFinancialsEditor';

interface UnitFinancialsEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unit: any;
  onSave: () => void;
}

export const UnitFinancialsEditorDialog: React.FC<UnitFinancialsEditorDialogProps> = ({
  isOpen,
  onClose,
  unit,
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
            Edit Financial Details - Unit {unit?.unit_number}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] p-6 pt-4">
          <UnitFinancialsEditor
            unit={unit}
            onSave={handleSave}
            onCancel={onClose}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};