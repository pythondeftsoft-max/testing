
import React from 'react';
import AddPropertyForm from './AddPropertyForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId?: string;
  userId?: string;
  userType?: string;
  onPropertyAdded?: () => void | Promise<void>;
  editingProperty?: any;
}

// Modal wrapper for the AddPropertyForm with property type selection
export function AddPropertyModal({ 
  isOpen, 
  onClose, 
  portfolioId,
  onPropertyAdded,
  editingProperty,
  userId,
  userType
}: AddPropertyModalProps) {
  const handlePropertyAdded = () => {
    if (onPropertyAdded) {
      onPropertyAdded();
    }
    onClose();
  };

  if (!userId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProperty ? 'Edit Property' : 'Add Property'}
          </DialogTitle>
        </DialogHeader>
        
        <AddPropertyForm
          userId={userId}
          onPropertyAdded={handlePropertyAdded}
          onCancel={onClose}
          editingProperty={editingProperty}
          portfolioId={portfolioId}
        />
      </DialogContent>
    </Dialog>
  );
}
