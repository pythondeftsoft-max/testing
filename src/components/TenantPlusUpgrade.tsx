
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, MessageSquare, Zap, Star, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TenantPlusUpgradeProps {
  tenantProfile: any;
}

const TenantPlusUpgrade = ({ tenantProfile }: TenantPlusUpgradeProps) => {
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: "Coming Soon!",
      description: "Plus subscription will be available soon. You'll get unlimited messaging and priority support.",
    });
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Unlimited Messages",
      description: "Send unlimited messages to all landlords"
    },
    {
      icon: Zap,
      title: "Priority Support",
      description: "Get faster responses and dedicated support"
    },
    {
      icon: Star,
      title: "Application Boost",
      description: "Your applications get highlighted to landlords"
    },
    {
      icon: Crown,
      title: "Plus Badge",
      description: "Show landlords you're a serious tenant"
    }
  ];

  if (tenantProfile?.is_plus_subscriber) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Plus Subscriber
            <Badge className="bg-yellow-100 text-yellow-800">Active</Badge>
          </CardTitle>
          <CardDescription>
            You're enjoying all Plus benefits! 
            {tenantProfile.plus_subscription_expires_at && (
              <span className="block mt-1">
                Expires: {new Date(tenantProfile.plus_subscription_expires_at).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">{feature.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-blue-600" />
          Upgrade to Plus
          <Badge variant="outline">$9.99/month</Badge>
        </CardTitle>
        <CardDescription>
          Get unlimited messaging and priority features to find your perfect home faster
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <IconComponent className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Current Plan: Free</p>
              <p className="text-xs text-gray-600">
                {tenantProfile?.message_credits || 0} message credits remaining
              </p>
            </div>
            <Button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-700">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>✓ Cancel anytime</p>
            <p>✓ 7-day free trial</p>
            <p>✓ Instant activation</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantPlusUpgrade;
