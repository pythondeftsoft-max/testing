
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import PropertyModalApplicationsSubTabs from '@/components/applications/PropertyModalApplicationsSubTabs';
import AdminApplicationsManager from './AdminApplicationsManager';

interface Property {
  id: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

interface ApplicationsManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
}

const ApplicationsManagerDialog = ({ isOpen, onClose, property }: ApplicationsManagerDialogProps) => {
  const { data: isAdmin = false } = useAdminCheck();
  
  if (!property) return null;

  // Helper function to format address
  const formatAddress = (property: Property) => {
    const parts = [property.street_1, property.street_2].filter(Boolean);
    const address = parts.join(' ') || 'No Address';
    const location = [property.city, property.state].filter(Boolean).join(', ');
    return location ? `${address}, ${location}` : address;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Applications Manager - {formatAddress(property)}
            {isAdmin && (
              <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-300">
                Admin Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {isAdmin ? (
            <AdminApplicationsManager
              propertyId={property.id}
              propertyAddress={formatAddress(property)}
            />
          ) : (
            <PropertyModalApplicationsSubTabs
              propertyId={property.id}
              propertyAddress={formatAddress(property)}
              aggregateAllUnits={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationsManagerDialog;
