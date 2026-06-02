import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown } from 'lucide-react';
import { usePropertyLimits, PropertyLimitData } from '@/hooks/usePropertyLimits';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@/config/featureFlags';

interface PropertyLimitWarningProps {
  userId: string;
  userType: string;
  portfolioId?: string;
  onSubscribe?: () => void;
}

const PropertyLimitWarning = ({ userId, userType, portfolioId, onSubscribe }: PropertyLimitWarningProps) => {
  const navigate = useNavigate();

  // Early return BEFORE calling hooks - feature flag check
  if (userType === 'tenant' || !featureFlags.landlordPropertyLimitWarningEnabled) return null;

  // Now safe to call hooks after early returns
  const { propertyLimits, getPropertyLimitMessage, getSubscriptionLink } = usePropertyLimits(userId, userType, portfolioId);

  if (!propertyLimits) return null;

  const message = getPropertyLimitMessage();
  if (!message) return null;

  const isAtLimit = propertyLimits.needs_sub;
  
  const handleSubscribeClick = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      navigate(getSubscriptionLink());
    }
  };

  return (
    <Alert className={isAtLimit ? "border-orange-200 bg-orange-50" : "border-yellow-200 bg-yellow-50"}>
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? "text-orange-600" : "text-yellow-600"}`} />
      <AlertTitle className={isAtLimit ? "text-orange-800" : "text-yellow-800"}>
        {isAtLimit ? "Subscription Required" : "Approaching Limit"}
      </AlertTitle>
      <AlertDescription className={`${isAtLimit ? "text-orange-700" : "text-yellow-700"} space-y-3`}>
        <p>{message}</p>
        {propertyLimits.billable_units_count > 0 && (
          <p className="text-sm">
            Cost: ${(propertyLimits.billable_units_count * 1.43).toFixed(2)}/month for {propertyLimits.billable_units_count} billable {propertyLimits.billable_units_count === 1 ? 'property' : 'properties'}
          </p>
        )}
        {isAtLimit && (
          <Button 
            onClick={handleSubscribeClick}
            className="bg-primary hover:bg-primary/90 text-white"
            size="sm"
          >
            <Crown className="w-4 h-4 mr-2" />
            Subscribe to Landlord Pro
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default PropertyLimitWarning;