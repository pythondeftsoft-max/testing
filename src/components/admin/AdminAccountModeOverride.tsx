import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Building2, History, ShieldAlert } from 'lucide-react';
import {
  useUserPmMode,
  useUserModeChangeHistory,
  useAdminSetUserPmMode,
} from '@/hooks/useUserPmMode';
import { useToast } from '@/hooks/use-toast';

interface AdminAccountModeOverrideProps {
  userId: string;
}

/**
 * AdminAccountModeOverride
 *
 * Admin-only card on the user detail page. Lets an admin flip a landlord's
 * `pm_mode_enabled` flag in either direction (bypassing the sticky lock that
 * applies to the user themselves), with a required reason and a confirmation
 * dialog. Shows the audit history of past mode changes.
 */
const AdminAccountModeOverride: React.FC<AdminAccountModeOverrideProps> = ({ userId }) => {
  const { toast } = useToast();
  const { data: pmEnabled, isLoading } = useUserPmMode(userId);
  const { data: history = [], isLoading: historyLoading } = useUserModeChangeHistory(userId);
  const setMode = useAdminSetUserPmMode();

  const [reason, setReason] = useState('');
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);

  const handleClickFlip = (next: boolean) => {
    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please add a short reason before changing this user’s account mode.',
        variant: 'destructive',
      });
      return;
    }
    setPendingMode(next);
  };

  const confirmFlip = async () => {
    if (pendingMode === null) return;
    try {
      await setMode.mutateAsync({
        userId,
        newMode: pendingMode,
        previousMode: !!pmEnabled,
        reason: reason.trim(),
      });
      toast({
        title: 'Account mode updated',
        description: pendingMode
          ? 'User is now in PM mode.'
          : 'User has been reverted to Listing mode.',
      });
      setReason('');
      setPendingMode(null);
    } catch (err: any) {
      toast({
        title: 'Could not update account mode',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
      setPendingMode(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                Account Mode Override
              </CardTitle>
              <CardDescription className="mt-1">
                Admin-only. Flip this landlord's PM/Listing mode and log the change.
              </CardDescription>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <Badge variant={pmEnabled ? 'default' : 'secondary'}>
                <Building2 className="h-3 w-3 mr-1" />
                {pmEnabled ? 'PM mode' : 'Listing mode'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mode-reason">Reason (required)</Label>
            <Textarea
              id="mode-reason"
              placeholder="e.g. Customer support ticket #1234 — landlord requested revert to Listing mode"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isLoading || pmEnabled === false || setMode.isPending}
              onClick={() => handleClickFlip(false)}
            >
              Revert to Listing mode
            </Button>
            <Button
              variant="default"
              disabled={isLoading || pmEnabled === true || setMode.isPending}
              onClick={() => handleClickFlip(true)}
            >
              Activate PM mode
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <History className="h-4 w-4" />
              Mode change history
            </h4>
            {historyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mode changes recorded yet.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((row: any) => (
                  <li
                    key={row.id}
                    className="text-sm border rounded-md p-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {row.previous_mode ? 'PM' : 'Listing'} → {row.new_mode ? 'PM' : 'Listing'}
                        </Badge>
                        <Badge
                          variant={row.changed_by_role === 'admin' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {row.changed_by_role === 'admin' ? 'Admin' : 'Self'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </div>
                    {row.reason && (
                      <p className="text-xs text-muted-foreground italic">{row.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={pendingMode !== null} onOpenChange={(open) => !open && setPendingMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMode ? 'Activate PM mode for this user?' : 'Revert this user to Listing mode?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This change will be logged with your admin ID and the reason you provided.
              The user’s data is preserved either way — only the dashboard UI changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFlip} disabled={setMode.isPending}>
              {setMode.isPending ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAccountModeOverride;
