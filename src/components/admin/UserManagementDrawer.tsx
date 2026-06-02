import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  CreditCard, 
  Coins, 
  Calendar, 
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';
import type { AdminSubscription } from '@/hooks/useAdminBilling';
import { useAdminGrantSubscription, useAdminAdjustQuota } from '@/hooks/useAdminSubscriptionManagement';
import { useAdminResetQuota } from '@/hooks/useAdminResetQuota';
import { useApplicationQuota } from '@/hooks/useApplicationQuota';

interface UserManagementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: AdminSubscription | null;
}

export const UserManagementDrawer: React.FC<UserManagementDrawerProps> = ({
  open,
  onOpenChange,
  subscription
}) => {
  const [subscriptionRole, setSubscriptionRole] = useState<string>('tenant');
  const [subscriptionMonths, setSubscriptionMonths] = useState<number>(1);
  const [quotaAdjustment, setQuotaAdjustment] = useState<number>(5);
  const [quotaReason, setQuotaReason] = useState<string>('');
  
  const grantSubscriptionMutation = useAdminGrantSubscription();
  const adjustQuotaMutation = useAdminAdjustQuota();
  const { resetQuota } = useAdminResetQuota();

  // Get current quota info for tenant users
  const { 
    remainingApplications, 
    isSubscriber, 
    loading: quotaLoading,
    refetch: refetchQuota
  } = useApplicationQuota(
    subscription?.role === 'tenant' ? subscription.user_id : undefined
  );

  if (!subscription) return null;

  const handleGrantSubscription = () => {
    grantSubscriptionMutation.mutate({
      userId: subscription.user_id,
      role: subscriptionRole,
      planType: 'pro',
      months: subscriptionMonths
    });
  };

  const handleAdjustQuota = (delta: number) => {
    if (subscription.role !== 'tenant') return;
    
    adjustQuotaMutation.mutate({
      tenantId: subscription.user_id,
      delta: delta,
      expiresInDays: 7,
      reason: quotaReason || `Admin ${delta > 0 ? 'added' : 'removed'} ${Math.abs(delta)} credits`
    });
    
    setTimeout(() => refetchQuota(), 1000);
  };

  const handleResetQuota = () => {
    if (subscription.role !== 'tenant') return;
    
    resetQuota.mutate({
      tenantId: subscription.user_id,
      reason: 'Admin manual reset'
    });
    
    setTimeout(() => refetchQuota(), 1000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Manage User: {subscription.user_name}
          </SheetTitle>
          <SheetDescription>
            Manage subscriptions and application quotas for this user.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* User Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{subscription.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline">{subscription.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Plan:</span>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.plan_type || 'None'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                  {subscription.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="role">Grant Subscription Role</Label>
                  <Select value={subscriptionRole} onValueChange={setSubscriptionRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="landlord">Landlord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="months">Duration (Months)</Label>
                  <Input
                    id="months"
                    type="number"
                    min="1"
                    max="12"
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button 
                  onClick={handleGrantSubscription}
                  disabled={grantSubscriptionMutation.isPending}
                  className="w-full"
                >
                  {grantSubscriptionMutation.isPending ? 'Granting...' : 'Grant Manual Subscription'}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                This will cancel any existing active subscription and create a manual override.
              </div>
            </CardContent>
          </Card>

          {/* Application Credits (Tenant Only) */}
          {subscription.role === 'tenant' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Application Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quotaLoading ? (
                  <div className="text-center py-4">Loading quota info...</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Current Remaining Applications:</span>
                      <Badge variant={isSubscriber ? 'default' : remainingApplications > 0 ? 'outline' : 'destructive'}>
                        {isSubscriber ? 'Unlimited' : remainingApplications}
                      </Badge>
                    </div>

                    <Separator />
                    
                    <div className="space-y-3">
                      <Label>Adjust Credits</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustQuota(-quotaAdjustment)}
                          disabled={adjustQuotaMutation.isPending}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove {quotaAdjustment}
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={quotaAdjustment}
                          onChange={(e) => setQuotaAdjustment(parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustQuota(quotaAdjustment)}
                          disabled={adjustQuotaMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add {quotaAdjustment}
                        </Button>
                      </div>
                      
                      <Input
                        placeholder="Reason for adjustment (optional)"
                        value={quotaReason}
                        onChange={(e) => setQuotaReason(e.target.value)}
                      />
                    </div>

                    <Separator />

                    <Button
                      variant="outline"
                      onClick={handleResetQuota}
                      disabled={resetQuota.isPending}
                      className="w-full"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Reset Weekly Window
                    </Button>

                    <div className="text-xs text-muted-foreground">
                      Adjustments expire after 7 days. Reset window gives a fresh 5 applications for the week.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};