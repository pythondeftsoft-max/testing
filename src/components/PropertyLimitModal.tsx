import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePropertyLimits } from '@/hooks/usePropertyLimits';

interface PropertyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userType: string;
  portfolioId?: string;
}

const PropertyLimitModal = ({ isOpen, onClose, userId, userType, portfolioId }: PropertyLimitModalProps) => {
  const { propertyLimits, getSubscriptionLink } = usePropertyLimits(userId, userType, portfolioId);
  const navigate = useNavigate();

  if (!propertyLimits) return null;

  const handleSubscribe = () => {
    navigate(getSubscriptionLink());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Property Limit Reached
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 space-y-4">
            <p>
              You've reached your free tier limit of <strong>{propertyLimits.free_limit} properties</strong>. 
              To add more properties and unlock premium features, upgrade to Landlord Pro.
            </p>
            
            {propertyLimits.billable_units_count > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium mb-2">Pricing Details:</p>
                <p className="text-blue-700">
                  ${(propertyLimits.billable_units_count * 1.43).toFixed(2)}/month for {propertyLimits.billable_units_count} billable {propertyLimits.billable_units_count === 1 ? 'property' : 'properties'}
                </p>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800 font-medium mb-2">Landlord Pro Benefits:</p>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Unlimited properties</li>
                <li>• Advanced analytics</li>
                <li>• Priority support</li>
                <li>• HAP payment tracking</li>
                <li>• Enhanced tenant screening</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubscribe}
            className="flex-1 bg-primary hover:bg-primary/90 text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            Subscribe to Landlord Pro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyLimitModal;