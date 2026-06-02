import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDenyAccessRequest, AccessRequest } from '@/hooks/useAccessRequests';

interface DenyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AccessRequest;
}

export const DenyRequestDialog: React.FC<DenyRequestDialogProps> = ({
  open,
  onOpenChange,
  request,
}) => {
  const [reason, setReason] = useState('');
  const denyRequest = useDenyAccessRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) return;

    denyRequest.mutate({
      requestId: request.id,
      reason: reason.trim(),
    }, {
      onSuccess: () => {
        setReason('');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deny Access Request</DialogTitle>
          <DialogDescription>
            Deny the request for {request.action} access to {request.object_name} at the {request.scope} level.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Denial Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please explain why this request is being denied..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Requester:</strong> {request.requester_id.slice(0, 8)}...</p>
            <p><strong>Requested:</strong> {request.action} access to {request.object_name}</p>
            <p><strong>Scope:</strong> {request.scope}</p>
            <p><strong>Justification:</strong> {request.justification || 'None provided'}</p>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={denyRequest.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={!reason.trim() || denyRequest.isPending}
            >
              {denyRequest.isPending ? 'Denying...' : 'Deny Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};