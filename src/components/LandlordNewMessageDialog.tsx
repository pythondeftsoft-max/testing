import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Home, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: string;
  status: string;
  tenant_id: string;
  properties?: {
    address: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
  source?: string;
}

interface LandlordNewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Application[];
  userId: string;
  onMessageSent: () => void;
}

const LandlordNewMessageDialog: React.FC<LandlordNewMessageDialogProps> = ({
  open,
  onOpenChange,
  applications,
  userId,
  onMessageSent,
}) => {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Filter to only show housed tenants (current tenants)
  const housedApplications = applications.filter(app => app.status === 'housed');

  const selectedApplication = housedApplications.find(app => app.id === selectedApplicationId);

  const getTenantName = (app: Application) => {
    if (app.profiles?.first_name || app.profiles?.last_name) {
      return `${app.profiles.first_name || ''} ${app.profiles.last_name || ''}`.trim();
    }
    return 'Tenant';
  };

  const handleSend = async () => {
    if (!selectedApplicationId || !messageText.trim()) return;

    setSending(true);
    try {
      const application = housedApplications.find(app => app.id === selectedApplicationId);
      const isMarketplaceApp = application?.source === 'marketplace';

      const messageData: any = {
        sender_id: userId,
        message_text: messageText.trim(),
        created_by_tenant: false,
      };

      if (isMarketplaceApp) {
        messageData.marketplace_application_id = selectedApplicationId;
      } else {
        messageData.property_application_id = selectedApplicationId;
      }

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;

      // Update message count
      if (application) {
        await supabase.rpc('update_message_count', {
          p_tenant_id: application.tenant_id,
          p_property_application_id: selectedApplicationId,
          p_is_from_tenant: false,
        });
      }

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the tenant.',
      });

      setMessageText('');
      setSelectedApplicationId('');
      onOpenChange(false);
      onMessageSent();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedApplicationId('');
    setMessageText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tenant Selector */}
          <div className="space-y-2">
            <Label>Select Tenant</Label>
            {housedApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No housed tenants available to message.
              </p>
            ) : (
              <Select
                value={selectedApplicationId}
                onValueChange={setSelectedApplicationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {housedApplications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{getTenantName(app)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Property Context */}
          {selectedApplication && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium">
                  {selectedApplication.properties?.address || 'Address not available'}
                </span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              disabled={!selectedApplicationId}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedApplicationId || !messageText.trim() || sending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandlordNewMessageDialog;
