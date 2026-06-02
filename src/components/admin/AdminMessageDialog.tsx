import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Mail, Loader2, Send, Info, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminDirectMessages } from '@/hooks/useAdminDirectMessages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  recipientName: string;
  recipientEmail?: string;
}

export const AdminMessageDialog: React.FC<AdminMessageDialogProps> = ({
  open,
  onOpenChange,
  recipientUserId,
  recipientName,
  recipientEmail,
}) => {
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'maintenance' | 'application' | 'urgent'>('general');
  const [showDetails, setShowDetails] = useState(false);

  const { messages, isLoading, sendMessage, isSending } = useAdminDirectMessages(recipientUserId);

  // Fetch user details
  const { data: userDetails, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['user-details', recipientUserId],
    queryFn: async () => {
      if (!recipientUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!recipientUserId && open,
  });

  const handleSend = () => {
    if (!subject.trim() || !messageText.trim()) return;

    sendMessage(
      {
        recipientId: recipientUserId,
        subject: subject.trim(),
        messageText: messageText.trim(),
        messageType,
      },
      {
        onSuccess: () => {
          setSubject('');
          setMessageText('');
          setMessageType('general');
        },
      }
    );
  };

  const getMessageTypeBadge = (type: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      general: { variant: 'secondary', label: 'General' },
      maintenance: { variant: 'default', label: 'Maintenance' },
      application: { variant: 'outline', label: 'Application' },
      urgent: { variant: 'destructive', label: 'Urgent' },
    };
    const config = variants[type] || variants.general;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Message {recipientName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {recipientEmail && <span>{recipientEmail}</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-7 text-xs"
              disabled={isLoadingDetails || !userDetails}
            >
              {isLoadingDetails ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Info className="h-3 w-3 mr-1" />
                  View Details
                </>
              )}
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          {/* Message History */}
          {messages.length > 0 && (
            <div className="flex-1 min-h-0">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Recent Messages ({messages.length})
              </h4>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-3">
                  {messages.slice(-5).map((msg) => (
                    <div key={msg.id} className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{msg.subject}</span>
                            {getMessageTypeBadge(msg.message_type)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.message_text}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>From: {msg.admin_first_name} {msg.admin_last_name}</span>
                        <span>{format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* New Message Form */}
          <div className="space-y-4 flex-shrink-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter message subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="messageType">Message Type</Label>
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                  <SelectTrigger id="messageType" disabled={isSending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="application">Application Update</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isSending}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {messageText.length} characters
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={!subject.trim() || !messageText.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* User Details (Collapsible) */}
          {(userDetails || detailsError) && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails} className="border-t pt-4">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <Info className="w-4 h-4 mr-2" />
                  User Details
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {detailsError ? (
                  <div className="rounded-lg border bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">Failed to load user details</p>
                  </div>
                ) : userDetails ? (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="font-semibold mb-1">Email</dt>
                        <dd className="text-muted-foreground">{userDetails.email}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold mb-1">User Type</dt>
                        <dd className="text-muted-foreground capitalize">{userDetails.user_type}</dd>
                      </div>
                      {userDetails.phone && (
                        <div>
                          <dt className="font-semibold mb-1">Phone</dt>
                          <dd className="text-muted-foreground">{userDetails.phone}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="font-semibold mb-1">User ID</dt>
                        <dd className="text-muted-foreground text-xs">
                          {userDetails.id.substring(0, 8)}...
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold mb-1">Created</dt>
                        <dd className="text-muted-foreground">
                          {new Date(userDetails.created_at).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
