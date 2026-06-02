import React from 'react';
import { Dialog, DialogPortal, DialogOverlay, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicationForm from './ApplicationForm';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  unitId?: string | null;
  onSuccess: () => void;
}

const ApplicationModal = ({
  isOpen,
  onClose,
  propertyId,
  unitId,
  onSuccess
}: ApplicationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal>
      <DialogPortal>
        <DialogOverlay className="z-[60] bg-background/80" />
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onPointerDown={(e) => {
              // Only close if clicking the backdrop, not the content
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div 
              className="relative bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95"
              onPointerDown={(e) => e.stopPropagation()}
            >
            <div className="overflow-y-auto max-h-[90vh] p-6">
              <div className="flex items-center justify-between mb-4">
                <DialogHeader className="p-0 space-y-0">
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    Submit Application
                  </DialogTitle>
                </DialogHeader>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="py-4">
                <ApplicationForm
                  propertyId={propertyId}
                  unitId={unitId || undefined}
                  onSuccess={onSuccess}
                  onCancel={onClose}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
};

export default ApplicationModal;
