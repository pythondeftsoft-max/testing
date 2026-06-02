import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  agencyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, shows the reactivate confirmation instead of offboard. */
  reactivate?: boolean;
}

export const OffboardAgencyDialog: React.FC<Props> = ({
  agencyId, agencyName, open, onOpenChange, reactivate = false,
}) => {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (open) { setConfirmText(''); setReason(''); }
  }, [open]);

  const action = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('offboard-agency', {
        body: { agency_id: agencyId, reason, reactivate },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(reactivate ? 'Agency reactivated' : 'Agency offboarded');
      queryClient.invalidateQueries({ queryKey: ['housing-authorities'] });
      queryClient.invalidateQueries({ queryKey: ['agency-staff', agencyId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error('Action failed', { description: e.message }),
  });

  const matched = confirmText.trim() === agencyName.trim();

  if (reactivate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate {agencyName}?</DialogTitle>
            <DialogDescription>
              Restores agency status to active and re-enables their staff accounts and white-label config.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => action.mutate()} disabled={action.isPending} className="w-full">
            {action.isPending ? 'Reactivating...' : 'Reactivate agency'}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Offboard {agencyName}
          </DialogTitle>
          <DialogDescription>
            Retire this agency without deleting its data. This is reversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
            <p className="font-medium">What happens:</p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
              <li>Agency record kept for HUD reporting & audit history</li>
              <li>All staff accounts deactivated (cannot log in)</li>
              <li>White-label subdomain / custom domain disabled</li>
              <li>Tenant and landlord links retained but archived</li>
              <li>Recurring billing & subscriptions paused</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., contract ended, switched providers, paused service…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type the agency name to confirm</Label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={agencyName}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!matched || action.isPending}
              onClick={() => action.mutate()}
            >
              {action.isPending ? 'Offboarding...' : 'Offboard agency'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OffboardAgencyDialog;
