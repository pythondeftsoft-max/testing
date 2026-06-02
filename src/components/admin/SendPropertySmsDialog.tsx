import React, { useState, useEffect } from 'react';
import { Send, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSendSms } from '@/hooks/useSmsMessaging';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SendPropertySmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactPhone: string;
  contactName: string;
  propertyAddress: string;
  monthlyRent?: number;
  propertyId?: string;
  tenantId?: string;
  landlordId?: string;
}

export const SendPropertySmsDialog: React.FC<SendPropertySmsDialogProps> = ({
  open,
  onOpenChange,
  contactPhone,
  contactName,
  propertyAddress,
  monthlyRent,
  propertyId,
  tenantId,
  landlordId,
}) => {
  const sendSms = useSendSms();

  const generateMessage = () => {
    let msg = `Hi ${contactName || 'there'}, check out this property at ${propertyAddress}.`;
    if (monthlyRent) {
      msg += ` Rent: $${monthlyRent.toLocaleString()}/mo.`;
    }
    msg += ' Let us know if you are interested!';
    return msg;
  };

  const [messageBody, setMessageBody] = useState(generateMessage());

  useEffect(() => {
    if (open) {
      setMessageBody(generateMessage());
    }
  }, [open, contactName, propertyAddress, monthlyRent]);

  const handleSend = async () => {
    if (!messageBody.trim() || !contactPhone) return;
    try {
      await sendSms.mutateAsync({
        to: contactPhone,
        body: messageBody,
        contact_name: contactName || undefined,
        property_id: propertyId,
        tenant_id: tenantId,
        landlord_id: landlordId,
      });
      toast.success('Property SMS sent successfully');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to send SMS: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Send Property via SMS
          </DialogTitle>
          <DialogDescription>
            Send property details to {contactName || contactPhone}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p className="font-medium">{propertyAddress}</p>
            {monthlyRent && (
              <p className="text-muted-foreground">${monthlyRent.toLocaleString()}/mo</p>
            )}
            <p className="text-muted-foreground text-xs">To: {contactPhone}</p>
          </div>
          <div>
            <Label>Message (editable)</Label>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!messageBody.trim() || sendSms.isPending}
            className="w-full"
          >
            {sendSms.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Property SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
