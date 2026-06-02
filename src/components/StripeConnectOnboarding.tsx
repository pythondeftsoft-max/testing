import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, DollarSign, CheckCircle, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { openStripeLink, copyStripeLink } from "@/utils/stripeLinks";

interface ConnectAccountStatus {
  account_id?: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_profile?: {
    name?: string;
    url?: string;
    product_description?: string;
  };
  external_account?: {
    bank_name?: string;
    last4?: string;
    routing_number?: string;
    account_holder_type?: string;
    status?: string;
  };
  payout_schedule?: {
    delay_days?: string | number;
    interval?: string;
  };
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
  is_dashboard_link?: boolean;
}

export const StripeConnectOnboarding: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<ConnectAccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  // Safe fallback for accountStatus
  const status = accountStatus ?? {
    onboarding_complete: false,
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false
  };

  const checkAccountStatus = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
      
      if (error) {
        // Handle specific error cases
        if (error.message?.includes('platform is responsible') || 
            error.message?.includes('account ID needs to be')) {
          setError('Your existing Stripe account is not compatible. We\'ll create a new account for you.');
        } else {
          throw error;
        }
      }
      
      if (data) {
        setAccountStatus(data);
      }
    } catch (error: any) {
      console.error('Error checking account status:', error);
      const errorMessage = error?.message || 'Failed to check payment setup status. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const handleRetry = () => {
    setInitialLoading(true);
    checkAccountStatus();
  };

  const handleOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
      
      if (error) {
        // Handle specific error cases
        if (error.message?.includes('platform is responsible') || 
            error.message?.includes('account ID needs to be')) {
          toast({
            title: "Account Updated",
            description: "Created a new compatible Stripe account. Please complete the setup process.",
          });
        } else {
          throw error;
        }
      }
      
      if (data?.onboarding_url) {
        const buttonText = accountStatus?.is_dashboard_link ? "Stripe dashboard" : "Stripe setup";
        
        // Use improved link opening with fallbacks
        openStripeLink(data.onboarding_url, { 
          buttonText,
          onCopyFallback: () => copyStripeLink(data.onboarding_url, buttonText)
        });
        
        // Refresh status after a delay
        setTimeout(() => {
          checkAccountStatus();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error starting onboarding:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to start payment setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const { data } = await supabase.functions.invoke('create-stripe-connect-account');
      if (data?.onboarding_url) {
        const buttonText = accountStatus?.is_dashboard_link ? "Stripe dashboard" : "Stripe setup";
        await copyStripeLink(data.onboarding_url, buttonText);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get Stripe link",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: boolean, label: string) => (
    <Badge variant={status ? "default" : "secondary"} className="flex items-center gap-1">
      {status ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  if (initialLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error && !accountStatus) {
    // Show different UI based on error type
    const isPlatformMismatch = error.includes('existing Stripe account is not compatible');
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {isPlatformMismatch ? "Account Setup Required" : "Connection Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={isPlatformMismatch ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRetry} className="w-full">
            {isPlatformMismatch ? "Create New Account" : "Try Again"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show safe default if no account status yet
  if (!accountStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Setup
          </CardTitle>
          <CardDescription>
            Set up your account to receive rent payments directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Complete your payment setup to start receiving rent payments automatically.
            </AlertDescription>
          </Alert>
          <Button onClick={handleOnboarding} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Payment Setup
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Setup
        </CardTitle>
        <CardDescription>
          Set up your account to receive rent payments directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.onboarding_complete ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment setup is complete! You can now receive rent payments.
              </AlertDescription>
            </Alert>

            {/* Payment Setup Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Payment Setup Summary</h4>
              
              <div className="grid gap-3">
                {/* Business Profile */}
                {accountStatus?.business_profile?.name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Business Name:</span>
                    <span className="font-medium">{accountStatus.business_profile.name}</span>
                  </div>
                )}

                {/* Payout Bank Account */}
                {accountStatus?.external_account ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payout Account:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {accountStatus?.external_account?.bank_name} ••••{accountStatus?.external_account?.last4}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {accountStatus?.external_account?.status} • {accountStatus?.external_account?.account_holder_type}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payout Account:</span>
                    <span className="text-orange-600">Setup Required</span>
                  </div>
                )}

                {/* Payout Schedule */}
                {accountStatus?.payout_schedule && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payout Schedule:</span>
                    <span className="font-medium capitalize">
                      {accountStatus.payout_schedule.interval === 'daily' ? 'Daily' : 
                       accountStatus.payout_schedule.interval === 'weekly' ? 'Weekly' : 'Monthly'}
                      {accountStatus.payout_schedule.delay_days && accountStatus.payout_schedule.delay_days !== 'auto' && 
                        ` (${accountStatus.payout_schedule.delay_days} day delay)`}
                    </span>
                  </div>
                )}

                {/* Account Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
              </div>

              {/* Requirements Alert */}
              {accountStatus?.requirements && (accountStatus.requirements.currently_due?.length > 0 || accountStatus.requirements.past_due?.length > 0) && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Action Required</div>
                    <div className="text-sm">
                      {accountStatus.requirements.past_due?.length > 0 && (
                        <div>Past due: {accountStatus.requirements.past_due.length} items</div>
                      )}
                      {accountStatus.requirements.currently_due?.length > 0 && (
                        <div>Currently due: {accountStatus.requirements.currently_due.length} items</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Complete your payment setup to start receiving rent payments automatically.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {getStatusBadge(status.details_submitted, "Account Info")}
          {getStatusBadge(status.charges_enabled, "Accept Payments")}
          {getStatusBadge(status.payouts_enabled, "Receive Payouts")}
        </div>

        {!status.onboarding_complete && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">
                💲 How it works
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tenants pay rent online through OpenKey</li>
                <li>• Payments are deposited directly into your bank account</li>
                <li>• Track all incoming payments in your dashboard</li>
                <li>• No setup fees or monthly charges</li>
                <li>• Secure processing powered by Stripe Connect</li>
              </ul>
            </div>

            <Button 
              onClick={handleOnboarding} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountStatus?.account_id ? "Continue Setup" : "Start Payment Setup"}
            </Button>
          </div>
        )}

        {status.onboarding_complete && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleOnboarding}
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                {accountStatus?.is_dashboard_link ? "Manage on Stripe" : "Continue Setup"}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleCopyLink}
                size="icon"
                title="Copy Stripe link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleRetry}
                size="icon"
                title="Refresh status"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Links open in new tab. If blocked, use the copy button to open manually.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};