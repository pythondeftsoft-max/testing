import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lock, Crown, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionPlanCard from './SubscriptionPlanCard';

interface FeatureGateProps {
  feature: string;
  role: 'tenant' | 'landlord';
  hasAccess: boolean;
  children: React.ReactNode;
  upgradePrompt?: string;
  className?: string;
}

const FEATURE_DESCRIPTIONS = {
  tenant: {
    'unlimited_applications': {
      title: 'Unlimited Applications',
      description: 'Apply to unlimited properties without monthly limits',
      icon: <Zap className="h-5 w-5" />
    },
    'priority_placement': {
      title: 'Priority Placement',
      description: 'Get placed ahead of non-subscribers in application queues',
      icon: <Crown className="h-5 w-5" />
    },
    'early_access': {
      title: 'Early Property Access',
      description: 'See new properties 24-48 hours before public listing',
      icon: <Zap className="h-5 w-5" />
    }
  },
  landlord: {
    'rent_payment': {
      title: 'Rent Payment Processing',
      description: 'Accept and track rent payments (FREE for first 10 units, then $1.16-$2/unit)',
      icon: <Zap className="h-5 w-5" />
    },
    'maintenance_management': {
      title: 'Maintenance Management',
      description: 'Track maintenance requests and work orders (FREE for first 10 units, then $1.16-$2/unit)',
      icon: <Zap className="h-5 w-5" />
    },
    'vendor_management': {
      title: 'Vendor Management',
      description: 'Manage vendors and contractors (FREE for first 10 units, then $1.16-$2/unit)',
      icon: <Zap className="h-5 w-5" />
    },
    'lease_management': {
      title: 'Lease Management',
      description: 'Track leases and tenant agreements (FREE for first 10 units, then $1.16-$2/unit)',
      icon: <Zap className="h-5 w-5" />
    },
    'request_tenant': {
      title: 'Request Tenant',
      description: 'Get matched with qualified tenants for your properties',
      icon: <Crown className="h-5 w-5" />
    },
    'cash_flow': {
      title: 'Cash Flow Tracking',
      description: 'Monitor income, expenses, and profitability',
      icon: <Zap className="h-5 w-5" />
    },
    'portfolio_metrics': {
      title: 'Portfolio Analytics',
      description: 'Advanced metrics and reporting for your properties',
      icon: <Crown className="h-5 w-5" />
    },
    'white_label_branding': {
      title: 'White-Label Branding',
      description: 'Custom branding, logos, and theme customization',
      icon: <Crown className="h-5 w-5" />
    },
    'white_label_domains': {
      title: 'Custom Domains',
      description: 'Use your own domain name for a professional presence',
      icon: <Crown className="h-5 w-5" />
    },
    'white_label_advanced': {
      title: 'Advanced Customization',
      description: 'Custom CSS, JavaScript, and advanced features',
      icon: <Crown className="h-5 w-5" />
    }
  }
};

const FeatureGate = ({ 
  feature, 
  role, 
  hasAccess, 
  children, 
  upgradePrompt,
  className = ""
}: FeatureGateProps) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();

  const featureInfo = FEATURE_DESCRIPTIONS[role]?.[feature];

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { role }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        setShowUpgradeDialog(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Overlay that blocks interaction */}
      <div className="relative">
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Upgrade to Access
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {featureInfo?.icon}
                  {featureInfo?.title || 'Premium Feature'}
                </DialogTitle>
                <DialogDescription>
                  {upgradePrompt || featureInfo?.description || 'This feature requires a subscription to access.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <SubscriptionPlanCard 
                  role={role}
                  isCurrentPlan={false}
                  hasActiveSubscription={false}
                />
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="flex-1">
                    Maybe Later
                  </Button>
                  <Button onClick={handleUpgrade} className="flex-1">
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default FeatureGate;