import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submission: { id: string; batch_reference: string; file_name: string | null } | null;
  onSuccess?: () => void;
}

const PicTransmitDialog: React.FC<Props> = ({ open, onOpenChange, submission, onSuccess }) => {
  const [transmitting, setTransmitting] = useState(false);

  const transmit = async () => {
    if (!submission) return;
    setTransmitting(true);
    const { data, error } = await supabase.functions.invoke('transmit-pic-submission', {
      body: { submission_id: submission.id },
    });
    setTransmitting(false);
    if (error || !data?.success) {
      toast.error(`Transmit failed: ${data?.error || error?.message || 'unknown'}`);
      return;
    }
    toast.success('Submitted to HUD via SFTP');
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-4 h-4" /> Transmit to HUD IMS-PIC</DialogTitle>
          <DialogDescription>
            Uploads <code className="text-xs">{submission?.file_name || '(no file)'}</code> for batch{' '}
            <strong>{submission?.batch_reference}</strong> to the HUD SFTP inbox.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertDescription className="text-sm">
            HUD will respond with an acknowledgement file within 24–72 hours. Use "HUD Response" to log the result once received.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transmitting}>Cancel</Button>
          <Button onClick={transmit} disabled={transmitting || !submission?.file_name}>
            {transmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Transmit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PicTransmitDialog;
