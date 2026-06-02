
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, DollarSign, Crown, Zap, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useApplicationQuota } from '@/hooks/useApplicationQuota';
import { useAdminPushCheck } from '@/hooks/useAdminPushCheck';

interface ApplicationModalProps {
  property: any;
  tenantId: string;
  tenantProfile: any;
  onClose: () => void;
  onApplicationSubmitted: () => void;
}

const ApplicationModal = ({ property, tenantId, tenantProfile, onClose, onApplicationSubmitted }: ApplicationModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { toast } = useToast();
  const { canApply, remainingApplications, isSubscriber, consumeQuota } = useApplicationQuota(tenantId);
  const { hasActiveAdminPush } = useAdminPushCheck(tenantId, property?.id);

  const handleSubmit = async () => {
    // Check application quota first (unless admin push bypass is active)
    if (!canApply && !hasActiveAdminPush) {
      if (isSubscriber) {
        toast({
          title: "Error",
          description: "Unable to submit application. Please try again.",
          variant: "destructive",
        });
      } else {
        setShowUpgradePrompt(true);
      }
      return;
    }

    setLoading(true);
    
    try {
      // Check if application already exists
      const { data: existingApplication } = await supabase
        .from('property_applications')
        .select('id')
        .eq('property_id', property.id)
        .eq('tenant_id', tenantId)
        .single();

      if (existingApplication) {
        toast({
          title: "Application Already Exists",
          description: "You have already applied for this property.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Submit the application (quota enforcement is handled by database trigger)
      const { error } = await supabase
        .from('property_applications')
        .insert({
          property_id: property.id,
          tenant_id: tenantId,
          status: 'pending',
          priority_payment_made: isSubscriber, // Mark as priority if subscriber
          priority_payment_amount: null
        });

      if (error) {
        // Check if it's a quota exceeded error (standardized token or fallback keywords)
        if (error.message?.includes('WEEKLY_APPLICATION_LIMIT_EXCEEDED') || 
            error.message?.includes('WEEKLY_QUOTA_EXCEEDED') ||
            error.message?.toLowerCase().includes('application limit') ||
            error.message?.toLowerCase().includes('weekly limit')) {
          toast({
            title: "Weekly Limit Reached",
            description: "You have reached your weekly application limit (3 per 7 days). Upgrade to Plus for unlimited applications!",
            variant: "destructive",
          });
          setShowUpgradePrompt(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      toast({
        title: "Application Submitted",
        description: "Your rental application has been submitted successfully.",
      });

      onApplicationSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { role: 'tenant' }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showUpgradePrompt) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Upgrade to Plus Required
            </DialogTitle>
            <DialogDescription>
              You've reached your weekly application limit (3 per 7 days)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="text-center space-y-3">
                  <Crown className="h-12 w-12 mx-auto text-yellow-600" />
                   <h3 className="font-semibold text-yellow-800">Upgrade to Plus Plan</h3>
                   <p className="text-sm text-yellow-700">
                     Get unlimited property applications and priority placement in landlord queues.
                   </p>
                  
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>Unlimited property applications per week</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>Unlimited messaging with landlords</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>No waiting for landlord responses</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>Priority application highlighting</span>
                    </div>
                  </div>
                  
                   <div className="pt-2">
                     <p className="text-lg font-bold text-yellow-800">Only $15/month</p>
                     <p className="text-xs text-yellow-600">Unlimited applications and priority status</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button 
                onClick={handleUpgradeClick}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Plus Plan
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Screening Request</DialogTitle>
          <DialogDescription>
            Send your profile to the landlord for: {property.address}
            {hasActiveAdminPush && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-green-800">
                  <strong>Admin Invite:</strong> You can apply even if you've reached your weekly limit
                </span>
              </div>
            )}
            {isSubscriber && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                ✨ <strong>Plus Plan is active</strong> - Unlimited applications & priority status
              </div>
            )}
            {!isSubscriber && !hasActiveAdminPush && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                📋 {remainingApplications} application{remainingApplications !== 1 ? 's' : ''} remaining this week (resets weekly)
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Property Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Property:</span>
                  <span className="text-sm">{property.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Monthly Rent:</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {property.monthly_rent}
                  </span>
                </div>
                {property.bedrooms && property.bathrooms && (
                  <div className="flex justify-between">
                    <span className="font-medium">Size:</span>
                    <span className="text-sm">
                      {property.bedrooms}br/{property.bathrooms}ba
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Completeness Warning */}
          {!tenantProfile && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Complete your profile for better results!</p>
                <p className="text-xs mt-1">
                  A complete tenant profile increases your chances of approval.
                </p>
              </div>
            </div>
          )}

          {/* Info Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">What happens next:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Your complete tenant profile will be sent to the landlord</li>
                <li>• The landlord will review your application</li>
                <li>• You'll receive a response within 24-48 hours</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              onClick={handleSubmit}
              disabled={loading || (!canApply && !hasActiveAdminPush)}
              className="flex-1"
            >
              {loading ? 'Submitting...' : (!canApply && !hasActiveAdminPush && !isSubscriber) ? 'Upgrade to Apply' : 'Send Screening Request'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
