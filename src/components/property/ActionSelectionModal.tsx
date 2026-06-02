
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, Users, X } from 'lucide-react';

interface ActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuickList: () => void;
  onSelectRequestTenant: () => void;
  propertyAddress: string;
}

export const ActionSelectionModal = ({
  isOpen,
  onClose,
  onSelectQuickList,
  onSelectRequestTenant,
  propertyAddress
}: ActionSelectionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">
            List Property on Market
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-6">
            Choose how you'd like to market your property at{' '}
            <span className="font-medium">{propertyAddress}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick List Option */}
            <div className="border rounded-lg p-6 space-y-4 hover:border-primary transition-colors">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Quick List</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a basic listing with essential details like rent, bedrooms, 
                bathrooms, description, and amenities.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Set monthly rent</li>
                <li>• Basic property details</li>
                <li>• Pet policy & amenities</li>
                <li>• Simple description</li>
              </ul>
              <Button 
                onClick={onSelectQuickList}
                className="w-full"
              >
                Quick List Property
              </Button>
            </div>

            {/* Request Tenant Option */}
            <div className="border rounded-lg p-6 space-y-4 hover:border-primary transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-600" />
                <h3 className="font-semibold">Request Qualified Tenant</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete marketing campaign with detailed property information 
                to attract the best qualified tenants.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Comprehensive property details</li>
                <li>• Professional marketing</li>
                <li>• Tenant qualification process</li>
                <li>• Multi-step application form</li>
              </ul>
              <Button 
                onClick={onSelectRequestTenant}
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              >
                Request Qualified Tenant
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
