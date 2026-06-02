import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Send, ChevronDown, Loader2, Info, Phone, Building, Calendar, CreditCard, User, CheckCircle, XCircle } from 'lucide-react';
import { useAdminDirectMessages } from '@/hooks/useAdminDirectMessages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdminMessageThreadModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminMessageThreadModal: React.FC<AdminMessageThreadModalProps> = ({
  userId,
  open,
  onOpenChange,
}) => {
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'maintenance' | 'application' | 'urgent'>('general');
  const [messageContent, setMessageContent] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, sendMessage, isSending } = useAdminDirectMessages(userId);

  // Fetch user details
  const { data: userDetails } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages?.length]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !userId) return;

    sendMessage(
      {
        recipientId: userId,
        subject: subject || 'No Subject',
        messageType,
        messageText: messageContent,
      }
    );
    
    setMessageContent('');
    setSubject('');
    setMessageType('general');
  };

  const fullName = userDetails
    ? `${userDetails.first_name} ${userDetails.last_name}`.trim() || userDetails.email
    : 'User';

  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{fullName}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {userDetails?.email}
                {userDetails?.user_type && (
                  <Badge variant="outline" className="ml-2">
                    {userDetails.user_type}
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* View Details button - positioned next to close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="absolute right-28 top-4 h-8 text-xs"
        >
          <Info className="h-3 w-3 mr-1" />
          View Details
        </Button>

        {/* Messages Thread */}
        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="py-4 space-y-4">
              {messages.map((message) => {
                const isFromAdmin = message.admin_user_id !== userId;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      isFromAdmin ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg p-4",
                        isFromAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {isFromAdmin ? 'You' : fullName}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {message.subject && message.subject !== 'No Subject' && (
                        <p className="text-sm font-semibold mb-1">{message.subject}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                      {message.message_type && message.message_type !== 'general' && (
                        <Badge variant="outline" className="mt-2">
                          {message.message_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </ScrollArea>

        {/* Message Composer */}
        <div className="border-t px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1"
            />
            <Select value={messageType} onValueChange={(v) => setMessageType(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Textarea
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="flex-1 min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || isSending}
              size="icon"
              className="h-[80px] w-12"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* User Details (Collapsible) */}
        {userDetails && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full border-t rounded-none"
              >
                <Info className="w-4 h-4 mr-2" />
                User Details
                <ChevronDown className="w-4 h-4 ml-auto transition-transform" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-6 py-4 border-t bg-muted/50">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                {/* Contact Information */}
                <div>
                  <dt className="font-semibold mb-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Email
                  </dt>
                  <dd className="text-muted-foreground">{userDetails.email}</dd>
                </div>
                
                {userDetails.phone && (
                  <div>
                    <dt className="font-semibold mb-1 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </dt>
                    <dd className="text-muted-foreground">{userDetails.phone}</dd>
                  </div>
                )}
                
                {userDetails.company_name && (
                  <div>
                    <dt className="font-semibold mb-1 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5" />
                      Company
                    </dt>
                    <dd className="text-muted-foreground">{userDetails.company_name}</dd>
                  </div>
                )}

                {/* Account Information */}
                <div>
                  <dt className="font-semibold mb-1">User Type</dt>
                  <dd>
                    <Badge variant="outline">{userDetails.user_type}</Badge>
                  </dd>
                </div>
                
                {userDetails.status && (
                  <div>
                    <dt className="font-semibold mb-1">Status</dt>
                    <dd>
                      <Badge 
                        variant={
                          userDetails.status === 'active' ? 'default' : 
                          userDetails.status === 'inactive' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {userDetails.status}
                      </Badge>
                    </dd>
                  </div>
                )}
                
                {userDetails.housing_status && (
                  <div>
                    <dt className="font-semibold mb-1">Housing Status</dt>
                    <dd>
                      <Badge variant="outline">{userDetails.housing_status}</Badge>
                    </dd>
                  </div>
                )}

                {/* Subscription Information */}
                {userDetails.subscription_tier && (
                  <div>
                    <dt className="font-semibold mb-1 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      Subscription
                    </dt>
                    <dd className="space-y-1">
                      <Badge variant="outline">{userDetails.subscription_tier}</Badge>
                      {userDetails.subscription_active !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          {userDetails.subscription_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-success" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-destructive" />
                              Inactive
                            </>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                )}

                {userDetails.subscription_expires_at && (
                  <div>
                    <dt className="font-semibold mb-1">Subscription Expires</dt>
                    <dd className="text-muted-foreground text-xs">
                      {new Date(userDetails.subscription_expires_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}

                {/* Worker Assignment */}
                {userDetails.assigned_worker_id && (
                  <>
                    <div>
                      <dt className="font-semibold mb-1">Assigned Worker</dt>
                      <dd className="text-muted-foreground text-xs">
                        {userDetails.assigned_worker_id.substring(0, 8)}...
                      </dd>
                    </div>
                    {userDetails.worker_assigned_at && (
                      <div>
                        <dt className="font-semibold mb-1">Assigned On</dt>
                        <dd className="text-muted-foreground text-xs">
                          {new Date(userDetails.worker_assigned_at).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                  </>
                )}

                {/* Stripe Information */}
                {userDetails.stripe_customer_id && (
                  <div>
                    <dt className="font-semibold mb-1">Stripe Customer</dt>
                    <dd className="text-muted-foreground text-xs">
                      {userDetails.stripe_customer_id.substring(0, 12)}...
                    </dd>
                  </div>
                )}

                {userDetails.stripe_onboarding_complete !== null && (
                  <div>
                    <dt className="font-semibold mb-1">Stripe Onboarding</dt>
                    <dd className="flex items-center gap-1">
                      {userDetails.stripe_onboarding_complete ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                          <span className="text-muted-foreground text-xs">Complete</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-warning" />
                          <span className="text-muted-foreground text-xs">Incomplete</span>
                        </>
                      )}
                    </dd>
                  </div>
                )}

                {/* Dates */}
                <div>
                  <dt className="font-semibold mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </dt>
                  <dd className="text-muted-foreground text-xs">
                    {new Date(userDetails.created_at).toLocaleDateString()}
                  </dd>
                </div>

                {userDetails.updated_at && (
                  <div>
                    <dt className="font-semibold mb-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Updated
                    </dt>
                    <dd className="text-muted-foreground text-xs">
                      {new Date(userDetails.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}

                {userDetails.deactivated_at && (
                  <div>
                    <dt className="font-semibold mb-1 text-destructive">Deactivated</dt>
                    <dd className="text-destructive text-xs">
                      {new Date(userDetails.deactivated_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}

                {/* User ID at the end */}
                <div className="col-span-2 md:col-span-3">
                  <dt className="font-semibold mb-1">User ID</dt>
                  <dd className="text-muted-foreground text-xs font-mono">
                    {userDetails.id}
                  </dd>
                </div>
              </dl>
            </CollapsibleContent>
          </Collapsible>
        )}
      </DialogContent>
    </Dialog>
  );
};
