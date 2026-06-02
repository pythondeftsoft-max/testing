import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Home, Anchor, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TenantMarketplaceSettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    userPreferences, 
    tenantPreferences, 
    tenantContext,
    businessPhase,
    setHousingInterest,
    isLoading 
  } = usePreferences();
  const { toast } = useToast();

  // Only show for tenants
  if (!user || !userPreferences || userPreferences.active_role_context !== 'tenant') {
    return null;
  }

  const showMarketplace = tenantPreferences?.housing_interest || false;

  const handleToggleMarketplace = (enabled: boolean) => {
    setHousingInterest(enabled);
    toast({
      title: enabled ? "Marketplace Access Enabled" : "Marketplace Access Disabled",
      description: enabled 
        ? "You can now browse available properties and submit applications."
        : "Marketplace access has been turned off. You can re-enable it anytime.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Settings</CardTitle>
          <CardDescription>Loading your marketplace preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-4 bg-muted rounded w-3/4"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace Settings</CardTitle>
        <CardDescription>
          Control your access to the property marketplace and housing search features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="marketplace-toggle" className="text-base font-medium">
              Show Marketplace
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable access to browse properties and submit applications
            </p>
          </div>
          <Switch
            id="marketplace-toggle"
            checked={showMarketplace}
            onCheckedChange={handleToggleMarketplace}
          />
        </div>

        {/* Current tenant status */}
        {tenantContext && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Your Status</Badge>
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

        {/* Business phase info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">Platform Mode</Badge>
            <p className="text-sm text-muted-foreground">
              {businessPhase === 'section8' 
                ? 'Currently optimized for voucher holders and those seeking housing assistance.'
                : 'Browse both assisted and market-rate properties.'
              }
            </p>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Badge variant="secondary" className="mt-0.5">Privacy</Badge>
            <p className="text-sm text-muted-foreground">
              Your housing search activity is private and only used to show relevant property recommendations.
              You can disable marketplace access at any time.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};