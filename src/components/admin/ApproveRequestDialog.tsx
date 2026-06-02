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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApproveAccessRequest, AccessRequest } from '@/hooks/useAccessRequests';

interface ApproveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AccessRequest;
}

export const ApproveRequestDialog: React.FC<ApproveRequestDialogProps> = ({
  open,
  onOpenChange,
  request,
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(request.requested_duration_minutes.toString());
  const approveRequest = useApproveAccessRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    approveRequest.mutate({
      requestId: request.id,
      minutes: parseInt(duration),
      reason: reason.trim() || undefined,
    }, {
      onSuccess: () => {
        setReason('');
        setDuration(request.requested_duration_minutes.toString());
        onOpenChange(false);
      },
    });
  };

  const getDurationLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Approve Access Request</DialogTitle>
          <DialogDescription>
            Grant temporary access to {request.action} {request.object_name} at the {request.scope} level.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Grant Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
                <SelectItem value="1440">1 day</SelectItem>
                <SelectItem value="2880">2 days</SelectItem>
                <SelectItem value="10080">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Approval Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Reason for granting access..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Requester:</strong> {request.requester_id.slice(0, 8)}...</p>
            <p><strong>Access:</strong> {request.action} {request.object_name}</p>
            <p><strong>Scope:</strong> {request.scope}</p>
            <p><strong>Duration:</strong> {getDurationLabel(parseInt(duration))}</p>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={approveRequest.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={approveRequest.isPending}
            >
              {approveRequest.isPending ? 'Approving...' : 'Approve Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};