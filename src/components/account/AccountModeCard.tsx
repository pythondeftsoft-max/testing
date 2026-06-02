import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Wrench, DollarSign, BarChart3, Calendar, Crown, Lock } from 'lucide-react';
import { usePmMode } from '@/hooks/usePmMode';
import { useToast } from '@/hooks/use-toast';

/**
 * AccountModeCard
 *
 * Lets a landlord upgrade from Listing mode to Property Management mode.
 * - OFF (Listing mode): clean dashboard focused on posting units + tenant matching
 * - ON  (PM mode):      full suite — Maintenance, Payments, Lease Expirations, Analytics, Rewards
 *
 * PM mode is a one-way upgrade. Once activated, the toggle locks and only an
 * admin can revert (via the admin override card). Activation requires an
 * explicit confirmation dialog.
 *
 * Toggling never deletes data — it's a pure UI filter.
 */
export const AccountModeCard: React.FC = () => {
  const { pmEnabled, loading, canRevert, setMode } = usePmMode();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const performToggle = async (next: boolean) => {
    const { error } = await setMode(next);
    if (error) {
      toast({
        title: 'Could not update account mode',
        description: error.message ?? 'Please try again.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: next ? 'Property Management mode on' : 'Listing mode on',
      description: next
        ? 'Maintenance, Payments, Lease Expirations, Analytics and Rewards are now visible.'
        : 'Showing the simplified listing view. PM features stay safely tucked away.',
    });
  };

  const handleSwitchChange = (next: boolean) => {
    if (next && !pmEnabled) {
      // Activating PM mode — require confirmation (this is permanent)
      setConfirmOpen(true);
      return;
    }
    // Any other transition (currently only allowed if user is somehow not yet PM)
    performToggle(next);
  };

  const isLocked = pmEnabled && !canRevert;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Account Mode
              </CardTitle>
              <CardDescription className="mt-1">
                Choose how much of OpenKey you want to see in your dashboard.
              </CardDescription>
            </div>
            <Badge variant={pmEnabled ? 'default' : 'secondary'}>
              {pmEnabled ? 'PM mode' : 'Listing mode'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-medium">Property Management features</p>
              <p className="text-sm text-muted-foreground">
                Maintenance requests, rent payments, lease tracking, analytics, and rewards.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart3 className="h-3 w-3" /> Analytics
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Lease Expirations
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Wrench className="h-3 w-3" /> Maintenance
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" /> Payments
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="h-3 w-3" /> Rewards
                </span>
              </div>
            </div>
            {isLocked ? (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                  <Lock className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            ) : (
              <Switch
                checked={pmEnabled}
                onCheckedChange={handleSwitchChange}
                disabled={loading}
                aria-label="Toggle Property Management features"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isLocked
              ? 'PM mode is permanent once activated. Contact support if you need to revert.'
              : 'Activating PM mode is permanent — your data is preserved either way.'}
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on Property Management mode?</AlertDialogTitle>
            <AlertDialogDescription>
              This unlocks Maintenance, Payments, Lease Expirations, Analytics, and Rewards.
              <br /><br />
              <strong>PM mode is permanent.</strong> Once activated, only support can switch
              you back to Listing mode. Your existing properties and listings are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                performToggle(true);
              }}
            >
              Activate PM mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AccountModeCard;
