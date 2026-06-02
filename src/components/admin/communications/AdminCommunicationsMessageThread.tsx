import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, MessageCircle, User, Mail, Phone, MapPin, DollarSign, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAdminDirectMessages } from '@/hooks/useAdminDirectMessages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminCommunicationsMessageThreadProps {
  selectedUserId: string | null;
  selectedUserName: string;
}

export const AdminCommunicationsMessageThread: React.FC<AdminCommunicationsMessageThreadProps> = ({
  selectedUserId,
  selectedUserName,
}) => {
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'maintenance' | 'application' | 'urgent'>('general');
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, isSending } = useAdminDirectMessages(selectedUserId);

  // Fetch user profile info
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile-info', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedUserId)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!subject.trim() || !messageText.trim() || !selectedUserId) return;

    sendMessage(
      {
        recipientId: selectedUserId,
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
    return <Badge variant={config.variant as any} className="text-xs">{config.label}</Badge>;
  };

  if (!selectedUserId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No User Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a user from the list to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Conversation with {selectedUserName}</h3>
        <p className="text-sm text-muted-foreground">Send direct messages to this user</p>
      </div>

      {/* Message Thread */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  "justify-end" // Admin messages always on the right
                )}
              >
                <div className={cn(
                  "max-w-[70%] rounded-lg p-4 space-y-2",
                  "bg-primary/10 border border-primary/20"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{msg.subject}</span>
                    {getMessageTypeBadge(msg.message_type)}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-primary/10">
                    <span className="text-xs text-muted-foreground">
                      From: {msg.admin_first_name} {msg.admin_last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation below</p>
          </div>
        )}
      </ScrollArea>

      {/* Message Composer */}
      <div className="p-4 border-t space-y-3 bg-muted/30">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input
              id="subject"
              placeholder="Message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="messageType" className="text-xs">Type</Label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger id="messageType" disabled={isSending} className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="message" className="text-xs">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your message..."
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            className="resize-none"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {messageText.length} characters
          </span>
          <Button 
            onClick={handleSend} 
            disabled={!subject.trim() || !messageText.trim() || isSending}
            size="sm"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* User Info Collapsible Section */}
      <Collapsible open={isUserInfoOpen} onOpenChange={setIsUserInfoOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full border-t rounded-none hover:bg-muted/50"
          >
            <User className="h-4 w-4 mr-2" />
            User Information
            {isUserInfoOpen ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <ScrollArea className="max-h-[300px]">
            {isProfileLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : userProfile ? (
              <div className="p-4 space-y-3">
                {/* User Header */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {userProfile.first_name} {userProfile.last_name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {userProfile.user_type}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{userProfile.email}</span>
                  </div>
                  {userProfile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{userProfile.phone}</span>
                    </div>
                  )}
                </div>

                {/* Additional Info for Tenants */}
                {userProfile.user_type === 'tenant' && (
                  <>
                    {((userProfile as any).city || (userProfile as any).zip_code) && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          LOCATION
                        </div>
                        {(userProfile as any).city && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">City:</span>
                            <span className="font-medium">{(userProfile as any).city}</span>
                          </div>
                        )}
                        {(userProfile as any).zip_code && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Zip Code:</span>
                            <span className="font-medium">{(userProfile as any).zip_code}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {((userProfile as any).monthly_income || (userProfile as any).max_rent) && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          FINANCIAL
                        </div>
                        {(userProfile as any).monthly_income && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Monthly Income:</span>
                            <span className="font-medium">${(userProfile as any).monthly_income.toLocaleString()}</span>
                          </div>
                        )}
                        {(userProfile as any).max_rent && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Rent:</span>
                            <span className="font-medium">${(userProfile as any).max_rent.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Account Info */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    ACCOUNT
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {(userProfile as any).is_plus_subscriber && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subscriber:</span>
                      <Badge variant="default" className="text-xs">Plus Member</Badge>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <User className="w-12 h-12 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">User profile not found</p>
              </div>
            )}
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
