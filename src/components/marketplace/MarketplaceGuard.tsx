
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceAccess } from '@/hooks/useMarketplaceAccess';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Search, CheckCircle, Anchor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PropertySearch from '@/pages/PropertySearch';
import ComponentsPropertySearch from '@/components/PropertySearch';

interface MarketplaceGuardProps {
  children?: React.ReactNode;
}

export const MarketplaceGuard: React.FC<MarketplaceGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const { hasMarketplaceAccess, isLoading: accessLoading } = useMarketplaceAccess();
  const { 
    userPreferences, 
    tenantPreferences, 
    isLoading: prefsLoading, 
    setHousingInterest,
    dismissMarketplacePrompt,
    tenantContext,
    businessPhase
  } = usePreferences();
  const { toast } = useToast();
  const { mutate: logEvent } = useMarketplaceEvents();

  // Log guard shown event
  useEffect(() => {
    if (!accessLoading && !prefsLoading) {
      logEvent({ eventType: 'guard_shown' });
    }
  }, [accessLoading, prefsLoading, logEvent]);

  const isLoading = accessLoading || prefsLoading;

  // Show loading state while preferences load
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading marketplace...</p>
          </div>
        </div>
      </div>
    );
  }

  // Anonymous users get the public marketplace
  if (!user || !userPreferences) {
    return <PropertySearch />;
  }

  // Logged-in users get the full marketplace with map
  if (userPreferences.active_role_context !== 'tenant') {
    return <ComponentsPropertySearch userId={user.id} tenantProfile={tenantPreferences} />;
  }

  // If tenant has marketplace access, show the Supabase-backed marketplace
  if (hasMarketplaceAccess) {
    return <ComponentsPropertySearch userId={user.id} tenantProfile={tenantPreferences} />;
  }

  // Show contextual opt-in prompt based on tenant type
  const handleOptIn = () => {
    logEvent({ eventType: 'opt_in_clicked' });
    setHousingInterest(true);
    toast({
      title: "Marketplace Access Enabled",
      description: "You can now browse available properties and submit applications.",
    });
  };

  // Log access granted when user gets access
  useEffect(() => {
    if (hasMarketplaceAccess) {
      logEvent({ eventType: 'access_granted' });
    }
  }, [hasMarketplaceAccess, logEvent]);

  const handleDismiss = () => {
    dismissMarketplacePrompt();
    window.location.href = '/dashboard';
  };

  // Determine if we should show the enable button based on business phase and tenant type
  const shouldShowEnableButton = () => {
    // For section8 mode, only show to voucher holders or those with residential tenancy
    if (businessPhase === 'section8') {
      return tenantContext?.isVoucherHolder || tenantContext?.hasResidentialTenancy;
    }
    // For mixed mode, show to all tenant types
    return true;
  };

  // Determine prompt message based on tenant context and business phase
  const getPromptContent = () => {
    if (tenantContext?.hasMarineTenancy && !tenantContext?.hasResidentialTenancy) {
      if (businessPhase === 'section8') {
        return {
          title: "Looking for Housing?",
          description: "We see you're currently renting a boat slip. If you're also looking for residential housing, we can help you find the perfect place.",
          icon: Home,
          buttonText: "Yes, Help Me Find Housing",
          features: [
            { text: "Browse quality residential properties", icon: Home },
            { text: "Apply directly through our platform", icon: Search },
            { text: "Connect with verified landlords", icon: CheckCircle }
          ]
        };
      } else {
        return {
          title: "Explore Housing Options",
          description: "We see you're currently renting a boat slip. You can also browse our residential property listings.",
          icon: Home,
          buttonText: "Browse Properties",
          features: [
            { text: "Browse available properties", icon: Home },
            { text: "Apply directly through our platform", icon: Search },
            { text: "Connect with verified landlords", icon: CheckCircle }
          ]
        };
      }
    }

    // For commercial-only tenants in section8 mode, show different message
    if (businessPhase === 'section8' && !tenantContext?.isVoucherHolder && !tenantContext?.hasResidentialTenancy) {
      return {
        title: "Property Marketplace",
        description: "Our marketplace is currently optimized for voucher holders and those seeking housing assistance. You can enable access in your profile settings if needed.",
        icon: Home,
        buttonText: null, // Don't show button for commercial-only in section8 mode
        features: [
          { text: "Platform optimized for voucher holders", icon: CheckCircle },
          { text: "Quality residential properties", icon: Home },
          { text: "Streamlined application process", icon: Search }
        ]
      };
    }

    return {
      title: "Property Marketplace",
      description: `Discover available properties and housing options. ${businessPhase === 'section8' ? 'Currently optimized for voucher holders and those seeking housing assistance.' : 'Browse both assisted and market-rate properties.'}`,
      icon: Home,
      buttonText: "Enable Marketplace Access",
      features: [
        { text: "Property Search & Filtering", icon: Search },
        { text: "Save Favorite Properties", icon: Home },
        { text: "Express Interest to Landlords", icon: CheckCircle }
      ]
    };
  };

  const content = getPromptContent();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <content.icon className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{content.title}</CardTitle>
              <CardDescription className="text-base">
                {content.description}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Features overview */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Search className="h-4 w-4" />
                What you'll get access to:
              </h3>
              <div className="grid gap-3">
                {content.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <feature.icon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm">{feature.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Show current tenant status */}
            {tenantContext && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">Current Status</Badge>
                  <div className="text-sm space-y-1">
                    {tenantContext.hasMarineTenancy && (
                      <p className="flex items-center gap-2">
                        <Anchor className="h-3 w-3" />
                        Marine tenant
                      </p>
                    )}
                    {tenantContext.hasResidentialTenancy && (
                      <p className="flex items-center gap-2">
                        <Home className="h-3 w-3" />
                        Residential tenant
                      </p>
                    )}
                    {tenantContext.isVoucherHolder && (
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        Voucher holder
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Privacy notice */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5">Privacy</Badge>
                <p className="text-sm text-muted-foreground">
                  Your housing search activity is private and only used to show relevant property recommendations.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {content.buttonText && shouldShowEnableButton() && (
                <Button onClick={handleOptIn} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  {content.buttonText}
                </Button>
              )}
              <Button variant="outline" onClick={handleDismiss} className="flex-1">
                {content.buttonText && shouldShowEnableButton() ? "Maybe Later" : "Back to Dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
