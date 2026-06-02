import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Search, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceAccess } from '@/hooks/useMarketplaceAccess';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';

const HomeMarketplaceCard = () => {
  const navigate = useNavigate();
  const { hasMarketplaceAccess } = useMarketplaceAccess();
  const { businessPhase, tenantContext, setHousingInterest } = usePreferences();
  const { mutate: logEvent } = useMarketplaceEvents();

  // Log card shown event
  useEffect(() => {
    logEvent({ eventType: 'card_shown' });
  }, [logEvent]);

  const handleCTAClick = (action: string) => {
    logEvent({ 
      eventType: 'cta_clicked',
      metadata: { action, source: 'dashboard_card' }
    });

    if (action === 'browse') {
      navigate('/marketplace');
    } else if (action === 'enable') {
      setHousingInterest(true);
      navigate('/marketplace');
    } else if (action === 'info') {
      navigate('/marketplace-info');
    }
  };

  // Determine CTA based on access and context
  const getCTAConfig = () => {
    if (hasMarketplaceAccess) {
      return {
        action: 'browse',
        text: 'Browse Properties',
        icon: Search,
        variant: 'default' as const
      };
    }

    // Phase-specific logic for non-access users
    if (businessPhase === 'section8') {
      // Section 8 only phase - only voucher holders should see enable option
      if (tenantContext?.isVoucherHolder) {
        return {
          action: 'enable',
          text: 'Enable Property Search',
          icon: Home,
          variant: 'default' as const
        };
      } else {
        // Marine-only tenants in section8 mode see info-only
        return {
          action: 'info',
          text: 'Learn More',
          icon: Info,
          variant: 'outline' as const
        };
      }
    } else if (businessPhase === 'mixed') {
      // Mixed phase - both voucher and marine tenants can enable
      if (tenantContext?.isVoucherHolder || tenantContext?.hasMarineTenancy) {
        return {
          action: 'enable',
          text: 'Enable Property Search',
          icon: Home,
          variant: 'default' as const
        };
      } else {
        return {
          action: 'info',
          text: 'Learn More',
          icon: Info,
          variant: 'outline' as const
        };
      }
    }

    // Default fallback
    return {
      action: 'info',
      text: 'Learn More',
      icon: Info,
      variant: 'outline' as const
    };
  };

  const ctaConfig = getCTAConfig();
  const IconComponent = ctaConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Discover Properties
        </CardTitle>
        <CardDescription>
          {hasMarketplaceAccess 
            ? 'Search and apply for housing opportunities'
            : 'Find housing that fits your needs and preferences'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasMarketplaceAccess 
              ? 'Access personalized property listings and streamlined application processes.'
              : businessPhase === 'section8' && !tenantContext?.isVoucherHolder
                ? 'Property marketplace features are available for eligible tenants.'
                : 'Enable marketplace access to search for properties and submit applications.'
            }
          </p>
          
          <Button
            variant={ctaConfig.variant}
            className="w-full"
            onClick={() => handleCTAClick(ctaConfig.action)}
          >
            <IconComponent className="mr-2 h-4 w-4" />
            {ctaConfig.text}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeMarketplaceCard;