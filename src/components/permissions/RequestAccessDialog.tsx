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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAccessRequest } from '@/hooks/useAccessRequests';

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: 'account' | 'portfolio';
  portfolioId?: string | null;
  objectName: string;
  action: 'view' | 'edit' | 'delete' | 'create';
}

export const RequestAccessDialog: React.FC<RequestAccessDialogProps> = ({
  open,
  onOpenChange,
  scope,
  portfolioId,
  objectName,
  action,
}) => {
  const [justification, setJustification] = useState('');
  const [duration, setDuration] = useState('60');
  const createAccessRequest = useCreateAccessRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!justification.trim()) return;

    createAccessRequest.mutate({
      scope,
      portfolioId: portfolioId || null,
      objectName,
      action,
      justification: justification.trim(),
      requestedDurationMinutes: parseInt(duration),
    }, {
      onSuccess: () => {
        setJustification('');
        setDuration('60');
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
          <DialogTitle>Request Access</DialogTitle>
          <DialogDescription>
            Request temporary access to {action} {objectName} at the {scope} level.
            {portfolioId && ' This request is for a specific portfolio.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Please explain why you need this access..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Requested Duration</Label>
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

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Requesting:</strong> {action} access to {objectName}</p>
            <p><strong>Scope:</strong> {scope}</p>
            <p><strong>Duration:</strong> {getDurationLabel(parseInt(duration))}</p>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createAccessRequest.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!justification.trim() || createAccessRequest.isPending}
            >
              {createAccessRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};